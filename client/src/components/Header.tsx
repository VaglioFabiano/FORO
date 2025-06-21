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

  return (
    <header className="header">
      {/* Video background */}
      <video 
        className="video-background" 
        autoPlay 
        muted 
        loop 
        playsInline
      >
        <source src="/assets/background-video.mp4" type="video/mp4" />
        <source src="/assets/background-video.webm" type="video/webm" />
      </video>
      
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
          <button className="primary-button">
            <span>Scopri di più</span>
          </button>
          <button className="secondary-button">
            Contattaci
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;