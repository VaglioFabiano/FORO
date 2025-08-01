import React, { useEffect, useState } from 'react';
import statutoImageFallback from '../assets/statuto.png';
import '../style/statuto.css';

interface StatutoData {
  link_drive: string;
}

interface User {
  id: number;
  level: number;
}

const Statuto: React.FC = () => {
  const [statutoData, setStatutoData] = useState<StatutoData>({
    link_drive: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<StatutoData>({
    link_drive: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Link di fallback
  const fallbackLink = "https://drive.google.com/file/d/19RWrdBR22kAbuwPdPwVjxxLjuTfzixaL/view?usp=sharing";

  useEffect(() => {
    loadStatutoData();
    checkUserPermissions();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const checkUserPermissions = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
      } catch (error) {
        console.error('Errore nel parsing user data:', error);
      }
    }
  };

  const loadStatutoData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/homepage');
      const data = await response.json();
      
      if (data.success && data.statuto) {
        const linkDrive = data.statuto.link_drive || fallbackLink;
        setStatutoData({ link_drive: linkDrive });
        setEditData({ link_drive: linkDrive });
      } else {
        // Usa il link di fallback
        setStatutoData({ link_drive: fallbackLink });
        setEditData({ link_drive: fallbackLink });
      }
    } catch (error) {
      console.error('Errore nel caricamento dati statuto:', error);
      // Usa il link di fallback in caso di errore
      setStatutoData({ link_drive: fallbackLink });
      setEditData({ link_drive: fallbackLink });
      setMessage({ type: 'error', text: 'Errore nel caricamento dati dello statuto' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(statutoData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(statutoData);
  };

  const handleSave = async () => {
    if (!currentUser) {
      setMessage({ type: 'error', text: 'Devi essere loggato per modificare lo statuto' });
      return;
    }

    // Validazione URL
    if (editData.link_drive && !isValidGoogleDriveUrl(editData.link_drive)) {
      setMessage({ type: 'error', text: 'Inserisci un link valido di Google Drive' });
      return;
    }

    try {
      setIsSaving(true);
      
      const response = await fetch('/api/homepage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'statuto',
          data: editData,
          user_id: currentUser.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatutoData(editData);
        setIsEditing(false);
        setMessage({ type: 'success', text: 'Link dello statuto aggiornato con successo!' });
      } else {
        throw new Error(data.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      setMessage({ type: 'error', text: 'Errore durante il salvataggio del link dello statuto' });
    } finally {
      setIsSaving(false);
    }
  };

  const isValidGoogleDriveUrl = (url: string): boolean => {
    if (!url) return true; // Permetti campo vuoto
    return url.includes('drive.google.com') && url.includes('/file/d/');
  };

  const extractFileIdFromDriveUrl = (url: string): string | null => {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const getImagePreviewUrl = (driveUrl: string): string => {
    const fileId = extractFileIdFromDriveUrl(driveUrl);
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/view?usp=drive_link`;
    }
    return driveUrl;
  };

  const canEdit = currentUser && (currentUser.level === 0 || currentUser.level === 1 || currentUser.level === 2);

  const renderEditModal = () => {
    if (!isEditing) return null;

    return (
      <div className="statuto-edit-modal-overlay" onClick={handleCancel}>
        <div className="statuto-edit-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Modifica Statuto</h3>
            <button className="close-button" onClick={handleCancel}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="drive-link">Link Google Drive dello Statuto</label>
              <input
                id="drive-link"
                type="url"
                value={editData.link_drive}
                onChange={(e) => setEditData({...editData, link_drive: e.target.value})}
                placeholder="https://drive.google.com/file/d/..."
                disabled={isSaving}
              />
              <small>
                Inserisci il link completo del file dello statuto su Google Drive. 
                Il link deve essere pubblico e iniziare con "https://drive.google.com/file/d/"
              </small>
              
              {editData.link_drive && (
                <div className="link-preview">
                  <p><strong>Anteprima URL:</strong></p>
                  <p className="preview-url">{getImagePreviewUrl(editData.link_drive)}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="cancel-button" 
              onClick={handleCancel}
              disabled={isSaving}
            >
              Annulla
            </button>
            <button 
              className="save-button" 
              onClick={handleSave}
              disabled={isSaving || (!!editData.link_drive && !isValidGoogleDriveUrl(editData.link_drive))}
            >
              {isSaving ? 'Salvando...' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="statuto-container">
        <div className="statuto-banner">
          <div className="statuto-loading">
            <p>Caricamento statuto...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentLink = statutoData.link_drive || fallbackLink;

  return (
    <div className="statuto-container">
      <div className="statuto-banner">
        <div className="statuto-banner-content">
          {canEdit && (
            <button className="edit-statuto-button" onClick={handleEdit}>
              ✏️ Modifica Statuto
            </button>
          )}

          {message && (
            <div className={`statuto-message ${message.type}`}>
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)}>×</button>
            </div>
          )}

          <div className="statuto-image-wrapper">
            <a href={currentLink} target="_blank" rel="noopener noreferrer">
              <img 
                src={statutoImageFallback} 
                alt="Anteprima Statuto" 
                className="statuto-image"
                onError={() => {
                  // Fallback in caso l'immagine non si carichi
                  console.log('Errore nel caricamento immagine statuto');
                }}
              />
            </a>
          </div>
          
          <div className="statuto-text-wrapper">
            <h2>Statuto dell'Associazione</h2>
            <p>
              Qui puoi consultare lo statuto che definisce i principi, gli obiettivi e il funzionamento 
              della nostra associazione. È il documento fondamentale che regola le nostre attività e 
              la partecipazione dei soci.
            </p>
            <a 
              href={currentLink} 
              target="_blank"
              rel="noopener noreferrer"
              className="statuto-download-btn"
            >
              📄 Scarica lo Statuto
            </a>
          </div>
        </div>
      </div>

      {renderEditModal()}
    </div>
  );
};

export default Statuto;