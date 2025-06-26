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
    <header id="header" className="header">
      <div className="header-background"></div>
      <div className="video-overlay"></div>
      
      <div className="header-content">
        <div className="logo-container">
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
        
        <div className="title-section">
          <h1 className="main-title">Aula Studio</h1>
          <p className="description">
            Siamo uno spazio gestito da volontari, dedicato allo studio silenzioso e allo studio ad alta voce:
            un ambiente accogliente dove ognuno può concentrarsi o confrontarsi nel rispetto reciproco.
          </p>
        </div>
        
        <div className="scroll-hint">
          <div className="scroll-arrow"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;