import React, { useState, useEffect } from 'react';
import '../style/header.css';

const Header: React.FC = () => {
  const [descrizione, setDescrizione] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [tempDescrizione, setTempDescrizione] = useState('');
  const [userLevel, setUserLevel] = useState<number | null>(null);

  useEffect(() => {
    loadDescrizione();
    checkUserLevel();
  }, []);

  const checkUserLevel = () => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserLevel(userData.level);
    }
  };

  const loadDescrizione = async () => {
    try {
      const response = await fetch('/api/homepage?section=header');
      const data = await response.json();
      
      if (data.success) {
        setDescrizione(data.descrizione);
        setTempDescrizione(data.descrizione);
      } else {
        // Fallback alla descrizione di default
        const defaultDesc = 'Siamo uno spazio gestito da volontari, dedicato allo studio silenzioso e allo studio ad alta voce: un ambiente accogliente dove ognuno può concentrarsi o confrontarsi nel rispetto reciproco.';
        setDescrizione(defaultDesc);
        setTempDescrizione(defaultDesc);
      }
    } catch (error) {
      console.error('Errore nel caricamento descrizione header:', error);
      // Fallback alla descrizione di default
      const defaultDesc = 'Siamo uno spazio gestito da volontari, dedicato allo studio silenzioso e allo studio ad alta voce: un ambiente accogliente dove ognuno può concentrarsi o confrontarsi nel rispetto reciproco.';
      setDescrizione(defaultDesc);
      setTempDescrizione(defaultDesc);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setTempDescrizione(descrizione);
  };

  const handleSaveClick = async () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) throw new Error('Utente non loggato');

      const userData = JSON.parse(user);
      
      const response = await fetch('/api/homepage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'header',
          data: { descrizione: tempDescrizione },
          user_id: userData.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDescrizione(tempDescrizione);
        setIsEditing(false);
      } else {
        throw new Error(data.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Errore nel salvataggio descrizione:', error);
      alert('Errore durante il salvataggio della descrizione');
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

  const canEdit = userLevel !== null && userLevel <= 2;

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
          {isLoading ? (
            <div className="description-loading">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          ) : isEditing ? (
            <div className="description-edit">
              <textarea
                value={tempDescrizione}
                onChange={(e) => setTempDescrizione(e.target.value)}
                className="description-textarea"
              />
              <div className="description-edit-buttons">
                <button onClick={handleSaveClick} className="edit-button save-button">
                  Salva
                </button>
                <button onClick={handleCancelClick} className="edit-button cancel-button">
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <div className="description-container">
              <p className="description">
                {descrizione}
              </p>
              {canEdit && (
                <button onClick={handleEditClick} className="edit-button">
                  Modifica
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="scroll-hint">
          <div className="scroll-arrow"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;