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

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const threshold = window.innerHeight * 0.1; // 10% of viewport height
      setIsScrolled(scrollTop > threshold);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const navigateToLogin = () => {
    onLoginClick();
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
              onClick={navigateToLogin}
            >
              {isInLoginPage ? 'Indietro' : 'Login'}
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
            onClick={navigateToLogin}
          >
            {isInLoginPage ? 'Indietro' : 'Login'}
          </button>
        </div>
      </div>
    </>
  );
};
export default Navbar;