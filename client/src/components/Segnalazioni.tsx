import React, { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';
import qrCodeFallback from '../assets/qrcodeSegnalazioni.png';
import '../style/segnalazioni.css';

interface SegnalazioniData {
  immagine: string;
  link: string;
}

interface User {
  id: number;
  level: number;
}

const Segnalazioni: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [segnalazioniData, setSegnalazioniData] = useState<SegnalazioniData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<SegnalazioniData>({
    immagine: '',
    link: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Link di fallback
  const fallbackFormLink = "https://docs.google.com/forms/d/e/1FAIpQLSe0B8XCGyZVzPNKn56J-l-rWpzsTCuyPmdQR2iy9EXtfTGBiw/viewform?embedded=true";

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadSegnalazioniData();
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

  const loadSegnalazioniData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/homepage?section=segnalazioni');
      const data = await response.json();
      
      if (data.success && data.segnalazioni) {
        setSegnalazioniData(data.segnalazioni);
      }
    } catch (error) {
      console.error('Errore nel caricamento dati segnalazioni:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dati delle segnalazioni' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    // Pre-popola con i dati della prima segnalazione se esiste
    const firstSegnalazione = segnalazioniData[0];
    if (firstSegnalazione) {
      setEditData({
        immagine: firstSegnalazione.immagine || '',
        link: firstSegnalazione.link || ''
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ immagine: '', link: '' });
  };

  const handleSave = async () => {
    if (!currentUser) {
      setMessage({ type: 'error', text: 'Devi essere loggato per modificare le segnalazioni' });
      return;
    }

    // Validazione URL
    if (editData.link && !isValidUrl(editData.link)) {
      setMessage({ type: 'error', text: 'Inserisci un link valido per il form' });
      return;
    }

    if (editData.immagine && !isValidUrl(editData.immagine)) {
      setMessage({ type: 'error', text: 'Inserisci un link valido per l\'immagine QR' });
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
          type: 'segnalazioni',
          data: editData,
          user_id: currentUser.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsEditing(false);
        setMessage({ type: 'success', text: 'Dati segnalazioni aggiornati con successo!' });
        loadSegnalazioniData(); // Ricarica i dati
      } else {
        throw new Error(data.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      setMessage({ type: 'error', text: 'Errore durante il salvataggio dei dati delle segnalazioni' });
    } finally {
      setIsSaving(false);
    }
  };

  const isValidUrl = (url: string): boolean => {
    if (!url) return true; // Permetti campo vuoto
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getCurrentData = () => {
    // Usa i dati più recenti o i fallback
    const latestSegnalazione = segnalazioniData[0];
    return {
      qrImage: latestSegnalazione?.immagine || qrCodeFallback,
      formLink: latestSegnalazione?.link || fallbackFormLink
    };
  };

  const canEdit = currentUser && (currentUser.level === 0 || currentUser.level === 1 || currentUser.level === 2);

  const renderEditModal = () => {
    if (!isEditing) return null;

    return (
      <div className="segnalazioni-edit-modal-overlay" onClick={handleCancel}>
        <div className="segnalazioni-edit-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Modifica Segnalazioni</h3>
            <button className="close-button" onClick={handleCancel}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="form-link">Link del Form Segnalazioni</label>
              <input
                id="form-link"
                type="url"
                value={editData.link}
                onChange={(e) => setEditData({...editData, link: e.target.value})}
                placeholder="https://docs.google.com/forms/d/..."
                disabled={isSaving}
              />
              <small>
                Link del form Google per le segnalazioni. Deve essere pubblico e embedded.
              </small>
            </div>
            
            <div className="form-group">
              <label htmlFor="qr-image">Link Immagine QR Code</label>
              <input
                id="qr-image"
                type="url"
                value={editData.immagine}
                onChange={(e) => setEditData({...editData, immagine: e.target.value})}
                placeholder="https://esempio.com/qr-code.png"
                disabled={isSaving}
              />
              <small>
                Link dell'immagine del QR code per accedere al form. Se vuoto, verrà usato il QR code di default.
              </small>
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
              disabled={
                isSaving ||
                (!!editData.link && !isValidUrl(editData.link)) ||
                (!!editData.immagine && !isValidUrl(editData.immagine))
              }
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
      <section className="segnalazioni-section" style={{ backgroundColor: 'rgb(254, 231, 203)' }}>
        <div className="container">
          <div className="segnalazioni-loading">
            <p>Caricamento sezione segnalazioni...</p>
          </div>
        </div>
      </section>
    );
  }

  const currentData = getCurrentData();

  return (
    <section className="segnalazioni-section" style={{ backgroundColor: 'rgb(254, 231, 203)' }}>
      <div className="container">
        <div className="segnalazioni-header">
          <h2 style={{ color: 'rgb(12, 73, 91)' }}>Segnalazioni</h2>
          {canEdit && (
            <button className="edit-segnalazioni-button" onClick={handleEdit}>
              <Edit size={16} />
               Modifica Segnalazioni
            </button>
          )}
        </div>

        {message && (
          <div className={`segnalazioni-message ${message.type}`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)}>×</button>
          </div>
        )}

        <div className="segnalazioni-content">
          <p style={{ color: 'rgb(12, 73, 91)', textAlign: 'center', marginBottom: '2rem', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
            Hai riscontrato problemi in aula o vuoi condividere un suggerimento per migliorare il nostro servizio? 
            Questo spazio è dedicato a te: segnalaci tutto ciò che ritieni importante!
          </p>
          
          {isMobile ? (
            <div className="mobile-form-container">
              <iframe 
                src={currentData.formLink}
                width="100%" 
                height={654}
                frameBorder="0" 
                marginHeight={0} 
                marginWidth={0}
                title="Form Segnalazioni Mobile"
              >
                Caricamento…
              </iframe>
            </div>
          ) : (
            <div className="desktop-form-container">
              <div className="qr-code-container">
                <img 
                  src={currentData.qrImage}
                  alt="QR Code per segnalazioni" 
                  className="qr-code-image"
                  onError={(e) => {
                    // Fallback all'immagine locale se il link esterno fallisce
                    const target = e.target as HTMLImageElement;
                    target.src = qrCodeFallback;
                  }}
                />
                <p style={{ color: 'rgb(12, 73, 91)', textAlign: 'center', marginTop: '1rem' }}>
                  Scansiona il QR code per accedere al form
                </p>
              </div>
              
              <div className="iframe-container">
                <iframe 
                  src={currentData.formLink}
                  width={600} 
                  height={600}
                  frameBorder="0" 
                  marginHeight={0} 
                  marginWidth={0}
                  title="Form Segnalazioni Desktop"
                >
                  Caricamento…
                </iframe>
              </div>
            </div>
          )}
        </div>
      </div>

      {renderEditModal()}
    </section>
  );
};

export default Segnalazioni;