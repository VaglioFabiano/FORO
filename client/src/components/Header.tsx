import React from 'react';
import '../style/header.css';

const Header: React.FC = () => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = e.target as HTMLImageElement;
    const nextSibling = target.nextElementSibling as HTMLElement;
    target.style.display = 'none';
    if (nextSibling) {
      nextSibling.style.display = 'flex';
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header id="header" className="header">
      {/* Background image */}
      <div 
        className="header-background"
        style={{
          backgroundImage: `url('/assets/header_photo.jpg')`
        }}
      ></div>
      
      {/* Overlay for better text readability */}
      <div className="video-overlay"></div>
      
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
          <button 
            className="primary-button"
            onClick={() => scrollToSection('orari')}
          >
            <span>Scopri di più</span>
          </button>
          <button 
            className="secondary-button"
            onClick={() => scrollToSection('footer')}
          >
            Contattaci
          </button>
        </div>

        {/* Navigation hint */}
        <div className="scroll-hint">
          <div className="scroll-arrow"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;