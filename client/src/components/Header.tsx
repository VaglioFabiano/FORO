import React from 'react';
import './style/Header.css'; 

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
      {/* Background with animated gradient */}
      <div className="header-background">
        <div className="header-overlay"></div>
      </div>
      
      {/* Floating elements */}
      <div className="floating-element floating-element-1"></div>
      <div className="floating-element floating-element-2"></div>
      
      <div className="header-content">
        <div className="header-container">
          <div className="logo-container">
            <div className="logo-glow"></div>
            <img 
              src="../assets/logo.png" 
              alt="Logo Aula Studio" 
              className="logo-image"
              onError={handleImageError}
            />
            <div className="logo-fallback">
              <span className="logo-fallback-text">AS</span>
            </div>
          </div>
          
          <div className="title-section">
            <h1 className="main-title">
              Aula Studio
            </h1>
            <div className="title-divider"></div>
            <p className="subtitle">
              Associazione del Terzo Settore
            </p>
          </div>
          
          <p className="description">
            Uno spazio dedicato allo studio e alla crescita personale, 
            dove la comunità si incontra per condividere conoscenza e obiettivi.
          </p>
          
          <div className="buttons-container">
            <button className="primary-button">
              Scopri di più
            </button>
            <button className="secondary-button">
              Contattaci
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;