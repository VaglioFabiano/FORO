import React, { useEffect } from 'react';
import { ExternalLink, MessageCircle } from 'lucide-react';
import '../style/social.css';

const SocialSection: React.FC = () => {
  useEffect(() => {
    // Carica script Instagram
    if (!document.querySelector('#instagram-embed-script')) {
      const script = document.createElement('script');
      script.id = 'instagram-embed-script';
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    }

    // Carica script Facebook
    if (!document.querySelector('#facebook-embed-script')) {
      const script = document.createElement('script');
      script.id = 'facebook-embed-script';
      script.src = 'https://connect.facebook.net/it_IT/sdk.js#xfbml=1&version=v18.0';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
    }
  }, []);

  const handleSocialClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="social-section">
      <h2 className="social-title">Seguici sui social</h2>
      
      {/* Riquadri Instagram e Facebook affiancati */}
      <div className="social-grid">
        {/* Instagram */}
        <div className="social-card instagram-card">
          <div className="card-header">
            <div className="card-icon instagram-icon">📸</div>
            <div className="card-info">
              <h3>Instagram</h3>
              <p>@associazioneforo</p>
            </div>
            <button 
              onClick={() => handleSocialClick('https://www.instagram.com/associazioneforo/')}
              className="visit-button"
            >
              <ExternalLink size={16} />
            </button>
          </div>
          
          <div className="posts-container">
            {/* Embed Instagram Post - Esempio */}
            <blockquote 
              className="instagram-media" 
              data-instgrm-permalink="https://www.instagram.com/p/placeholder/"
              data-instgrm-version="14"
            >
              <div className="post-placeholder">
                <div className="placeholder-content">
                  <div className="placeholder-avatar"></div>
                  <div className="placeholder-text">
                    <div className="placeholder-line"></div>
                    <div className="placeholder-line short"></div>
                  </div>
                </div>
                <div className="placeholder-image"></div>
                <p className="placeholder-caption">Caricamento post Instagram...</p>
              </div>
            </blockquote>
          </div>
        </div>

        {/* Facebook */}
        <div className="social-card facebook-card">
          <div className="card-header">
            <div className="card-icon facebook-icon">👥</div>
            <div className="card-info">
              <h3>Facebook</h3>
              <p>Associazione Foro</p>
            </div>
            <button 
              onClick={() => handleSocialClick('https://www.facebook.com/profile.php?id=61553896114681&locale=it_IT')}
              className="visit-button"
            >
              <ExternalLink size={16} />
            </button>
          </div>
          
          <div className="posts-container">
            {/* Embed Facebook Post - Esempio */}
            <div 
              className="fb-post" 
              data-href="https://www.facebook.com/profile.php?id=61553896114681"
              data-width="auto"
              data-show-text="true"
            >
              <div className="post-placeholder">
                <div className="placeholder-content">
                  <div className="placeholder-avatar"></div>
                  <div className="placeholder-text">
                    <div className="placeholder-line"></div>
                    <div className="placeholder-line short"></div>
                  </div>
                </div>
                <div className="placeholder-image"></div>
                <p className="placeholder-caption">Caricamento post Facebook...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Barra Telegram */}
      <div 
        className="telegram-bar"
        onClick={() => handleSocialClick('https://t.me/aulastudioforo')}
      >
        <div className="telegram-content">
          <div className="telegram-icon">
            <MessageCircle size={20} />
          </div>
          <div className="telegram-info">
            <h3>Telegram</h3>
            <p>@aulastudioforo</p>
            <span className="telegram-description">
              Canale ufficiale per comunicazioni rapide e coordinamento gruppi studio
            </span>
          </div>
          <div className="telegram-status">
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span>Attivo</span>
            </div>
            <ExternalLink size={16} className="external-icon" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialSection;