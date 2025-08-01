import React, { useState, useEffect } from 'react';
import '../style/header.css';

const Header: React.FC = () => {
  const [descrizione, setDescrizione] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [tempDescrizione, setTempDescrizione] = useState('');
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const defaultDescription = 'Siamo uno spazio gestito da volontari, dedicato allo studio silenzioso e allo studio ad alta voce: un ambiente accogliente dove ognuno può concentrarsi o confrontarsi nel rispetto reciproco.';

  useEffect(() => {
    loadDescrizione();
    checkUserLevel();
  }, []);

  const checkUserLevel = () => {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        console.log('User data:', userData); // Debug
        setUserLevel(userData.level);
      } else {
        console.log('No user found in localStorage'); // Debug
      }
    } catch (error) {
      console.error('Errore nel parsing user data:', error);
      setUserLevel(null);
    }
  };

  const loadDescrizione = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/homepage?section=header');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data); // Debug
      
      if (data.success && data.descrizione) {
        setDescrizione(data.descrizione);
        setTempDescrizione(data.descrizione);
      } else {
        console.log('Using default description');
        setDescrizione(defaultDescription);
        setTempDescrizione(defaultDescription);
      }
    } catch (error) {
      console.error('Errore nel caricamento descrizione header:', error);
      setDescrizione(defaultDescription);
      setTempDescrizione(defaultDescription);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    // Assicurati che tempDescrizione sia aggiornata
    setTempDescrizione(descrizione);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setTempDescrizione(descrizione);
  };

  const handleSaveClick = async () => {
    if (isSaving) return; // Previeni doppi click

    try {
      setIsSaving(true);
      
      const user = localStorage.getItem('user');
      console.log('Raw user data from localStorage:', user); // Debug
      
      if (!user) {
        alert('Devi essere loggato per modificare la descrizione');
        return;
      }

      const userData = JSON.parse(user);
      console.log('Parsed user data:', userData); // Debug
      console.log('User ID:', userData.id); // Debug
      console.log('User ID type:', typeof userData.id); // Debug
      
      if (!userData.id) {
        alert('Dati utente non validi. Riprova a fare il login.');
        return;
      }
      
      const requestBody = {
        type: 'header',
        data: { descrizione: tempDescrizione.trim() },
        user_id: userData.id === 0 ? 1 : userData.id // Converti 0 a 1
      };
      
      console.log('Final request body:', requestBody); // Debug
      console.log('Descrizione length:', tempDescrizione.trim().length); // Debug
      
      const response = await fetch('/api/homepage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status); // Debug
      console.log('Response ok:', response.ok); // Debug

      if (!response.ok) {
        // Prova a leggere il messaggio di errore dal server
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.log('Error response data:', errorData); // Debug
        } catch (e) {
          console.log('Could not parse error response as JSON'); // Debug
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Save response:', data); // Debug

      if (data.success) {
        setDescrizione(tempDescrizione.trim());
        setIsEditing(false);
        console.log('Descrizione salvata con successo');
      } else {
        throw new Error(data.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Errore nel salvataggio descrizione:', error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert(`Errore durante il salvataggio: ${errorMessage}`);
    } finally {
      setIsSaving(false);
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

  const canEdit = userLevel !== null && (userLevel === 0 || userLevel === 1 || userLevel === 2);

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
                placeholder="Inserisci la descrizione..."
                disabled={isSaving}
              />
              <div className="description-edit-buttons">
                <button 
                  onClick={handleSaveClick} 
                  className="edit-button save-button"
                  disabled={isSaving || tempDescrizione.trim() === ''}
                >
                  {isSaving ? 'Salvando...' : 'Salva'}
                </button>
                <button 
                  onClick={handleCancelClick} 
                  className="edit-button cancel-button"
                  disabled={isSaving}
                >
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