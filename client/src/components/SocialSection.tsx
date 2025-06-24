import React, { useEffect, useState, useRef } from 'react';
import { ExternalLink, MessageCircle, RefreshCw } from 'lucide-react';
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

const SocialSection: React.FC = () => {
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const instagramCardRef = useRef<HTMLDivElement>(null);
  const facebookIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadSocialScripts();
    
    const timer = setTimeout(() => {
      if (window.instgrm) {
        window.instgrm.Embeds.process();
        setEmbedLoaded(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!instagramCardRef.current) return;

    const card = instagramCardRef.current;
    const handleMouseEnter = () => {
      const iframe = card.querySelector('iframe');
      if (iframe) {
        iframe.src += '&autoplay=1';
      }
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [embedLoaded]);

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
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderInstagramContent = () => {
    return (
      <div className="posts-container">
        <div className="posts-grid">
          <div className="instagram-embed-wrapper">
            <blockquote 
              className="instagram-media" 
              data-instgrm-captioned 
              data-instgrm-permalink="https://www.instagram.com/reel/DB9E6wptM1V/?utm_source=ig_embed&utm_campaign=loading&autoplay=1" 
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
                <a href="https://www.instagram.com/reel/DB9E6wptM1V/" target="_blank" rel="noopener noreferrer">
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
    return (
      <div className="facebook-embed-container">
        <iframe 
          ref={facebookIframeRef}
          src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Fassociazioneforopiossasco%2Fposts%2Fpfbid0355NGksgUsUpB5xW6uKkEp5aNDWFcTSBGvCNng9AmQqmDZf55zZqS2Co2v5aLA799l&show_text=true&width=500" 
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
          title="Post Facebook di Associazione Foro"
          onLoad={() => setEmbedLoaded(true)}
        ></iframe>
        
        {!embedLoaded && (
          <div className="loading-state">
            <RefreshCw className="loading-spinner" size={24} />
            <p>Caricamento post Facebook...</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="social-section">
      <h2 className="social-title">Seguici sui social</h2>
      
      <div className="social-grid">
        {/* Instagram Card */}
        <div 
          ref={instagramCardRef}
          className="social-card instagram-card"
          onClick={(e) => handleSocialClick('https://www.instagram.com/associazioneforo/', e)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSocialClick('https://www.instagram.com/associazioneforo/');
            }
          }}
          aria-label="Visita il profilo Instagram di Associazione Foro"
        >
          <div className="social-card-header">
            <div className="social-platform-info">
              <div className="instagram-icon">
                📸
              </div>
              <div>
                <h3 className="platform-title">Instagram</h3>
                <p className="platform-username">@associazioneforo</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleSocialClick('https://www.instagram.com/associazioneforo/', e);
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSocialClick('https://www.facebook.com/associazioneforopiossasco');
            }
          }}
          aria-label="Visita la pagina Facebook di Associazione Foro"
        >
          <div className="social-card-header">
            <div className="social-platform-info">
              <div className="facebook-icon-header">
                👥
              </div>
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
          onClick={(e) => handleSocialClick('https://t.me/aulastudioforo', e)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSocialClick('https://t.me/aulastudioforo');
            }
          }}
          aria-label="Unisciti al canale Telegram di Associazione Foro"
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
    </section>
  );
};

export default SocialSection;