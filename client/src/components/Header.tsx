import React from 'react';
import './header.css';

const Header: React.FC = () => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = e.target as HTMLImageElement;
    const nextSibling = target.nextElementSibling as HTMLElement;
    target.style.display = 'none';
    if (nextSibling) {
      nextSibling.style.display = 'flex';
    }
  };

  return (
    <header className="header">
      {/* Floating animated elements */}
      <div className="floating-element-1"></div>
      <div className="floating-element-2"></div>
      <div className="floating-element-3"></div>
      <div className="floating-element-4"></div>
      
      {/* Main content */}
      <div className="header-content">
        {/* Logo section */}
        <div className="logo-container">
          <div className="logo-glow"></div>
          <img 
            src="/assets/logo.png"
            alt="Logo Aula Studio" 
            className="logo-image"
            onError={handleImageError}
          />
          <div className="logo-fallback">
            <span className="logo-fallback-text">AS</span>
          </div>
        </div>
        
        {/* Title section */}
        <div className="title-section">
          <h1 className="main-title">
            Aula Studio
          </h1>
          <div className="title-divider"></div>
          <p className="subtitle">
            Associazione del Terzo Settore
          </p>
        </div>
        
        {/* Description */}
        <p className="description">
          Uno spazio dedicato allo studio e alla crescita personale, 
          dove la comunità si incontra per condividere conoscenza e obiettivi.
        </p>
        
        {/* Buttons */}
        <div className="buttons-container">
          <button className="primary-button">
            <span>Scopri di più</span>
          </button>
          <button className="secondary-button">
            Contattaci
          </button>
        </div>
      </div>
      
      {/* Animated particles */}
      <div className="particles">
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>
      </div>
      
      {/* Bottom gradient */}
      <div className="bottom-gradient"></div>
    </header>
  );
};

export default Header;