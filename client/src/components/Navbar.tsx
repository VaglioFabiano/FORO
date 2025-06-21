import React, { useState, useEffect } from 'react';
import '../style/navbar.css';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

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
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
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

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => scrollToSection('header')}>
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
            onClick={() => scrollToSection('footer')}
          >
            Contatti
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="mobile-menu-toggle">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;