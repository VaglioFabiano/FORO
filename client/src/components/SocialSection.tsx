import React, { useEffect, useState, useRef } from 'react';
import { ExternalLink, MessageCircle, RefreshCw, Edit } from 'lucide-react';
import '../style/social.css';

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

interface SocialData {
  post_instagram: string;
  post_facebook: string;
  canale_telegram: string;
}

interface User {
  id: number;
  level: number;
}

const SocialSection: React.FC = () => {
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [socialData, setSocialData] = useState<SocialData>({
    post_instagram: '',
    post_facebook: '',
    canale_telegram: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<SocialData>({
    post_instagram: '',
    post_facebook: '',
    canale_telegram: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const instagramCardRef = useRef<HTMLDivElement>(null);
  const facebookIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadSocialData();
    checkUserPermissions();
    loadSocialScripts();
  }, []);

  useEffect(() => {
    if (socialData.post_instagram) {
      const timer = setTimeout(() => {
        if (window.instgrm) {
          window.instgrm.Embeds.process();
          setEmbedLoaded(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [socialData.post_instagram]);

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

  const loadSocialData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/homepage');
      const data = await response.json();
      
      if (data.success && data.social) {
        setSocialData(data.social);
        setEditData(data.social);
      }
    } catch (error) {
      console.error('Errore nel caricamento dati social:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei dati social' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSocialScripts = () => {
    if (!document.querySelector('#instagram-embed-script')) {
      const script = document.createElement('script');
      script.id = 'instagram-embed-script';
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
      
      script.onload = () => {
        if (window.instgrm) {
          window.instgrm.Embeds.process();
          setEmbedLoaded(true);
        }
      };
    }
  };

  const handleSocialClick = (url: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(socialData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(socialData);
  };

  const handleSave = async () => {
    if (!currentUser) {
      setMessage({ type: 'error', text: 'Devi essere loggato per modificare i social' });
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
          type: 'social',
          data: editData,
          user_id: currentUser.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSocialData(editData);
        setIsEditing(false);
        setMessage({ type: 'success', text: 'Link social aggiornati con successo!' });
        
        // Ricarica gli embed dopo l'aggiornamento
        setTimeout(() => {
          if (window.instgrm) {
            window.instgrm.Embeds.process();
          }
        }, 500);
      } else {
        throw new Error(data.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      setMessage({ type: 'error', text: 'Errore durante il salvataggio dei link social' });
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = currentUser && (currentUser.level === 0 || currentUser.level === 1 || currentUser.level === 2);

  /*
  const extractInstagramPostId = (url: string) => {
    const match = url.match(/\/p\/([^\/\?]+)|\/reel\/([^\/\?]+)/);
    return match ? (match[1] || match[2]) : null;
  };*/

  const renderInstagramContent = () => {
    const postUrl = socialData.post_instagram;
    
    if (!postUrl) {
      return (
        <div className="loading-state">
          <p>Nessun post Instagram configurato</p>
        </div>
      );
    }

    return (
      <div className="posts-container">
        <div className="posts-grid">
          <div className="instagram-embed-wrapper">
            <blockquote 
              className="instagram-media" 
              data-instgrm-captioned 
              data-instgrm-permalink={postUrl}
              data-instgrm-version="14"
              style={{
                width: '100%',
                maxWidth: '100%',
                margin: 0,
                padding: 0,
                overflow: 'hidden'
              }}
            >
              <div style={{padding: '16px'}}>
                <a href={postUrl} target="_blank" rel="noopener noreferrer">
                  Visualizza questo post su Instagram
                </a>
              </div>
            </blockquote>
          </div>
          
          {!embedLoaded && (
            <div className="loading-state">
              <RefreshCw className="loading-spinner" size={24} />
              <p>Caricamento post Instagram...</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFacebookContent = () => {
    const postUrl = socialData.post_facebook;
    
    if (!postUrl) {
      return (
        <div className="loading-state">
          <p>Nessun post Facebook configurato</p>
        </div>
      );
    }

    return (
      <div className="facebook-embed-container">
        <iframe 
          ref={facebookIframeRef}
          src={postUrl}
          width="100%" 
          height="100%" 
          style={{
            border: 'none',
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            height: '150%',
            transform: 'translateY(-50%)'
          }} 
          scrolling="no" 
          frameBorder="0" 
          allowFullScreen={true}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          title="Post Facebook"
          onLoad={() => setEmbedLoaded(true)}
        />
        
        {!embedLoaded && (
          <div className="loading-state">
            <RefreshCw className="loading-spinner" size={24} />
            <p>Caricamento post Facebook...</p>
          </div>
        )}
      </div>
    );
  };

  const renderEditModal = () => {
    if (!isEditing) return null;

    return (
      <div className="social-edit-modal-overlay" onClick={handleCancel}>
        <div className="social-edit-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Modifica Link Social</h3>
            <button className="close-button" onClick={handleCancel}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="instagram-post">Link Post Instagram</label>
              <input
                id="instagram-post"
                type="url"
                value={editData.post_instagram}
                onChange={(e) => setEditData({...editData, post_instagram: e.target.value})}
                placeholder="https://www.instagram.com/reel/..."
                disabled={isSaving}
              />
              <small>Inserisci il link del post o reel Instagram da mostrare</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="facebook-post">Link Post Facebook (Embed)</label>
              <input
                id="facebook-post"
                type="url"
                value={editData.post_facebook}
                onChange={(e) => setEditData({...editData, post_facebook: e.target.value})}
                placeholder="https://www.facebook.com/plugins/post.php?href=..."
                disabled={isSaving}
              />
              <small>Inserisci il link embed del post Facebook</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="telegram-channel">Link Canale Telegram</label>
              <input
                id="telegram-channel"
                type="url"
                value={editData.canale_telegram}
                onChange={(e) => setEditData({...editData, canale_telegram: e.target.value})}
                placeholder="https://t.me/nomecanale"
                disabled={isSaving}
              />
              <small>Inserisci il link del canale Telegram</small>
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
      <section className="social-section">
        <div className="loading-state">
          <RefreshCw className="loading-spinner" size={24} />
          <p>Caricamento sezione social...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="social-section">
      <div className="social-header">
        <h2 className="social-title">Seguici sui social</h2>
        {canEdit && (
          <button className="edit-social-button" onClick={handleEdit}>
            <Edit size={16} />
            Modifica Link
          </button>
        )}
      </div>

      {message && (
        <div className={`social-message ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}
      
      <div className="social-grid">
        {/* Instagram Card */}
        <div 
          ref={instagramCardRef}
          className="social-card instagram-card"
          onClick={(e) => {
            const profileUrl = socialData.post_instagram ? 
              socialData.post_instagram.replace(/\/p\/.*|\/reel\/.*/, '') : 
              'https://www.instagram.com/associazioneforo/';
            handleSocialClick(profileUrl, e);
          }}
          role="button"
          tabIndex={0}
          aria-label="Visita il profilo Instagram"
        >
          <div className="social-card-header">
            <div className="social-platform-info">
              <div className="instagram-icon">📸</div>
              <div>
                <h3 className="platform-title">Instagram</h3>
                <p className="platform-username">@associazioneforo</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const profileUrl = socialData.post_instagram ? 
                  socialData.post_instagram.replace(/\/p\/.*|\/reel\/.*/, '') : 
                  'https://www.instagram.com/associazioneforo/';
                handleSocialClick(profileUrl, e);
              }}
              className="external-link-btn"
              aria-label="Apri Instagram in una nuova scheda"
            >
              <ExternalLink size={16} />
            </button>
          </div>
          
          <div className="social-card-content">
            {renderInstagramContent()}
          </div>
        </div>

        {/* Facebook Card */}
        <div 
          className="social-card facebook-card"
          onClick={(e) => handleSocialClick('https://www.facebook.com/associazioneforopiossasco', e)}
          role="button"
          tabIndex={0}
          aria-label="Visita la pagina Facebook"
        >
          <div className="social-card-header">
            <div className="social-platform-info">
              <div className="facebook-icon-header">👥</div>
              <div>
                <h3 className="platform-title">Facebook</h3>
                <p className="platform-username">Associazione Foro</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleSocialClick('https://www.facebook.com/associazioneforopiossasco', e);
              }}
              className="external-link-btn"
              aria-label="Apri Facebook in una nuova scheda"
            >
              <ExternalLink size={16} />
            </button>
          </div>
          
          <div className="social-card-content facebook-content">
            {renderFacebookContent()}
          </div>
        </div>
      </div>
      
      {/* Telegram Bar */}
      <div className="telegram-container">
        <div 
          className="telegram-bar"
          onClick={(e) => handleSocialClick(socialData.canale_telegram, e)}
          role="button"
          tabIndex={0}
          aria-label="Unisciti al canale Telegram"
        >
          <div className="telegram-content">
            <div className="telegram-info">
              <div className="telegram-icon">
                <MessageCircle size={20} />
              </div>
              <div className="telegram-text">
                <h3 className="telegram-title">Telegram</h3>
                <p className="telegram-username">@aulastudioforo</p>
                <span className="telegram-description">
                  Canale ufficiale per comunicazioni
                </span>
              </div>
            </div>
            <div className="telegram-status">
              <div className="status-badge">
                <div className="status-indicator"></div>
                <span>Attivo</span>
              </div>
              <ExternalLink size={16} className="telegram-arrow" />
            </div>
          </div>
        </div>
      </div>

      {renderEditModal()}
    </section>
  );
};

export default SocialSection;