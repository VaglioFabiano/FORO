import React, { useEffect, useState } from 'react';
import '../style/footer.css';

interface FooterData {
  link_instagram: string;
  link_facebook: string;
  link_telegram: string;
  email: string;
}

interface User {
  id: number;
  level: number;
}

const Footer: React.FC = () => {
  const [footerData, setFooterData] = useState<FooterData>({
    link_instagram: '',
    link_facebook: '',
    link_telegram: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<FooterData>({
    link_instagram: '',
    link_facebook: '',
    link_telegram: '',
    email: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    loadFooterData();
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

  const loadFooterData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/homepage');
      const data = await response.json();
      
      if (data.success && data.contatti) {
        const defaultData = {
          link_instagram: data.contatti.link_instagram || 'https://www.instagram.com/associazioneforo/',
          link_facebook: data.contatti.link_facebook || 'https://www.facebook.com/associazioneforopiossasco',
          link_telegram: data.contatti.link_telegram || 'https://t.me/aulastudioforo',
          email: data.contatti.email || 'associazioneforopiossasco@gmail.com'
        };
        setFooterData(defaultData);
        setEditData(defaultData);
      }
    } catch (error) {
      console.error('Errore nel caricamento dati footer:', error);
      // Valori di fallback
      const fallbackData = {
        link_instagram: 'https://www.instagram.com/associazioneforo/',
        link_facebook: 'https://www.facebook.com/associazioneforopiossasco',
        link_telegram: 'https://t.me/aulastudioforo',
        email: 'associazioneforopiossasco@gmail.com'
      };
      setFooterData(fallbackData);
      setEditData(fallbackData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(footerData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(footerData);
  };

  const handleSave = async () => {
    if (!currentUser) {
      setMessage({ type: 'error', text: 'Devi essere loggato per modificare i contatti' });
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
          type: 'contatti',
          data: editData,
          user_id: currentUser.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFooterData(editData);
        setIsEditing(false);
        setMessage({ type: 'success', text: 'Contatti aggiornati con successo!' });
      } else {
        throw new Error(data.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      setMessage({ type: 'error', text: 'Errore durante il salvataggio dei contatti' });
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = currentUser && (currentUser.level === 0 || currentUser.level === 1 || currentUser.level === 2);

  const renderEditModal = () => {
    if (!isEditing) return null;

    return (
      <div className="footer-edit-modal-overlay" onClick={handleCancel}>
        <div className="footer-edit-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Modifica Contatti</h3>
            <button className="close-button" onClick={handleCancel}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({...editData, email: e.target.value})}
                placeholder="associazione@example.com"
                disabled={isSaving}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="telegram">Link Telegram</label>
              <input
                id="telegram"
                type="url"
                value={editData.link_telegram}
                onChange={(e) => setEditData({...editData, link_telegram: e.target.value})}
                placeholder="https://t.me/nomecanale"
                disabled={isSaving}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="instagram">Link Instagram</label>
              <input
                id="instagram"
                type="url"
                value={editData.link_instagram}
                onChange={(e) => setEditData({...editData, link_instagram: e.target.value})}
                placeholder="https://www.instagram.com/nomeprofilo/"
                disabled={isSaving}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="facebook">Link Facebook</label>
              <input
                id="facebook"
                type="url"
                value={editData.link_facebook}
                onChange={(e) => setEditData({...editData, link_facebook: e.target.value})}
                placeholder="https://www.facebook.com/nomepagina"
                disabled={isSaving}
              />
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
              disabled={isSaving}
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
      <footer className="footer-container">
        <div className="footer-content">
          <div className="loading-state">
            <p>Caricamento contatti...</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-header">
          <h3>Contatti</h3>
          {canEdit && (
            <button className="edit-footer-button" onClick={handleEdit}>
              ✏️ Modifica
            </button>
          )}
        </div>

        {message && (
          <div className={`footer-message ${message.type}`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)}>×</button>
          </div>
        )}
        
        <div className="contact-info">
          <p>
            <a href={`mailto:${footerData.email}`}>
              {footerData.email}
            </a>
          </p>
        </div>
        
        <div className="social-links">
          {footerData.link_telegram && (
            <a href={footerData.link_telegram} target="_blank" rel="noopener noreferrer">
              <span className="social-icon">📨</span> Telegram
            </a>
          )}
          {footerData.link_instagram && (
            <a href={footerData.link_instagram} target="_blank" rel="noopener noreferrer">
              <span className="social-icon">📷</span> Instagram
            </a>
          )}
          {footerData.link_facebook && (
            <a href={footerData.link_facebook} target="_blank" rel="noopener noreferrer">
              <span className="social-icon">👍</span> Facebook
            </a>
          )}
        </div>
        
        <div className="copyright">
          <p>© {new Date().getFullYear()} FORO ETS. Tutti i diritti riservati.</p>
        </div>
      </div>

      {renderEditModal()}
    </footer>
  );
};

export default Footer;