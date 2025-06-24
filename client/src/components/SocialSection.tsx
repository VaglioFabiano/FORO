import React, { useEffect, useState } from 'react';
import { ExternalLink, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import '../style/social.css';

// Type declaration for Instagram embed script
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
    FB?: {
      XFBML: {
        parse: () => void;
      };
    };
  }
}

interface InstagramPost {
  id: string;
  permalink: string;
  media_type: string;
  media_url?: string;
  caption?: string;
  timestamp: string;
}

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
}

const SocialSection: React.FC = () => {
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [facebookPosts] = useState<FacebookPost[]>([]);
  const [instagramLoading, setInstagramLoading] = useState(true);
  const [facebookLoading, setFacebookLoading] = useState(true);
  const [instagramError, setInstagramError] = useState<string | null>(null);
  const [facebookError, setFacebookError] = useState<string | null>(null);

  // Instagram username
  //const INSTAGRAM_USERNAME = 'associazioneforo';

  useEffect(() => {
    loadSocialScripts();
    fetchInstagramPosts();
    fetchFacebookPosts();
  }, []);

  const loadSocialScripts = () => {
    // Carica script Instagram
    if (!document.querySelector('#instagram-embed-script')) {
      const script = document.createElement('script');
      script.id = 'instagram-embed-script';
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
      
      script.onload = () => {
        if (window.instgrm) {
          window.instgrm.Embeds.process();
        }
      };
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
  };

  const fetchInstagramPosts = async () => {
    try {
      setInstagramLoading(true);
      
      // Simula un caricamento per un'esperienza più realistica
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Post fittizio usando il video fornito
      const mockPosts: InstagramPost[] = [
        {
          id: 'mock-post-1',
          permalink: 'https://www.instagram.com/p/mock-post-1/',
          media_type: 'VIDEO',
          media_url: '../asset/instagramVideo.mp4',
          caption: 'POV: hai scoperto che c\'è un\'aula studio a Piossasco e che l\'8 novembre c\'è un evento di presentazione (con aperitivo gratis🍹)Vi aspettiamo🚀#foro #piossasco #studenti #universita',
          timestamp: new Date().toISOString()
        }
      ];
      
      setInstagramPosts(mockPosts);
      
    } catch (error) {
      console.error('Errore nel fetch Instagram:', error);
      setInstagramError('Impossibile caricare i post di Instagram');
    } finally {
      setInstagramLoading(false);
    }
  };

  const fetchFacebookPosts = async () => {
    try {
      setFacebookLoading(true);
      
      // Per Facebook, senza un access token valido, mostriamo direttamente il fallback
      // In produzione avresti bisogno di:
      // 1. Un'app Facebook registrata
      // 2. Access token valido
      // 3. API backend per gestire le chiamate
      
      throw new Error('Facebook API richiede autenticazione');
      
    } catch (error) {
      console.error('Errore nel fetch Facebook:', error);
      setFacebookError('Impossibile caricare i post di Facebook');
      setFacebookLoading(false);
    }
  };

  const retryFetch = (platform: 'instagram' | 'facebook') => {
    if (platform === 'instagram') {
      setInstagramError(null);
      fetchInstagramPosts();
    } else {
      setFacebookError(null);
      fetchFacebookPosts();
    }
  };

  const handleSocialClick = (url: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderInstagramContent = () => {
    if (instagramLoading) {
      return (
        <div className="loading-state">
          <RefreshCw className="spin" size={24} />
          <p>Caricamento post Instagram...</p>
        </div>
      );
    }

    if (instagramError || instagramPosts.length === 0) {
      return (
        <div className="error-state">
          <AlertCircle size={24} />
          <p>Post non disponibili al momento</p>
          <button 
            onClick={() => handleSocialClick('https://www.instagram.com/associazioneforo/')}
            className="info-button"
          >
            Clicca qui per maggiori informazioni
          </button>
          <button 
            onClick={() => retryFetch('instagram')}
            className="retry-button"
            title="Riprova a caricare"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      );
    }

    return (
      <div className="posts-grid">
        {instagramPosts.slice(0, 2).map((post) => (
          <div key={post.id} className="instagram-post-mock">
            <div className="post-header">
              <div className="post-avatar instagram-avatar">
                <span>📸</span>
              </div>
              <div className="post-info">
                <strong>@associazioneforo</strong>
                <span className="verified">✓</span>
              </div>
            </div>
            
            <div className="post-media">
              {post.media_type === 'VIDEO' && post.media_url ? (
                <video 
                  controls 
                  muted 
                  playsInline
                  className="post-video"
                  poster="/api/placeholder/300/300"
                >
                  <source src={post.media_url} type="video/mp4" />
                  Il tuo browser non supporta i video HTML5.
                </video>
              ) : (
                <div className="post-image-placeholder">
                  <span>📱</span>
                </div>
              )}
            </div>
            
            <div className="post-content">
              <div className="post-actions">
                <span className="action-item">❤️ 42</span>
                <span className="action-item">💬 8</span>
                <span className="action-item">📤</span>
              </div>
              
              {post.caption && (
                <div className="post-caption">
                  <strong>associazioneforo</strong> {post.caption}
                </div>
              )}
              
              <div className="post-time">
                {new Date(post.timestamp).toLocaleDateString('it-IT')}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFacebookContent = () => {
    if (facebookLoading) {
      return (
        <div className="loading-state">
          <RefreshCw className="spin" size={24} />
          <p>Caricamento post Facebook...</p>
        </div>
      );
    }

    if (facebookError || facebookPosts.length === 0) {
      return (
        <div className="error-state">
          <AlertCircle size={24} />
          <p>Post non disponibili al momento</p>
          <button 
            onClick={() => handleSocialClick('https://www.facebook.com/profile.php?id=61553896114681&locale=it_IT')}
            className="info-button"
          >
            Clicca qui per maggiori informazioni
          </button>
          <button 
            onClick={() => retryFetch('facebook')}
            className="retry-button"
            title="Riprova a caricare"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      );
    }

    return (
      <div className="posts-grid">
        {facebookPosts.slice(0, 2).map((post) => (
          <div key={post.id} className="facebook-post">
            <div className="post-header">
              <div className="post-avatar facebook-avatar">f</div>
              <div className="post-info">
                <strong>Associazione Foro</strong>
                <span>• {new Date(post.created_time).toLocaleDateString('it-IT')}</span>
              </div>
            </div>
            <div className="post-content">
              <p>{post.message || 'Visualizza il post completo su Facebook'}</p>
              <div className="post-actions">
                <span>👍 Mi piace</span>
                <span>💬 Commenta</span>
                <span>↗️ Condividi</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="social-section">
      <h2 className="social-title">Seguici sui social</h2>
      
      <div className="social-grid">
        {/* Instagram Card */}
        <div 
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
          <div className="card-header">
            <div className="card-icon instagram-icon" aria-hidden="true">
              📸
            </div>
            <div className="card-info">
              <h3>Instagram</h3>
              <p>@associazioneforo</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleSocialClick('https://www.instagram.com/associazioneforo/', e);
              }}
              className="visit-button"
              aria-label="Apri Instagram in una nuova scheda"
            >
              <ExternalLink size={16} />
            </button>
          </div>
          
          <div className="posts-container">
            {renderInstagramContent()}
          </div>
        </div>

        {/* Facebook Card */}
        <div 
          className="social-card facebook-card"
          onClick={(e) => handleSocialClick('https://www.facebook.com/profile.php?id=61553896114681&locale=it_IT', e)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSocialClick('https://www.facebook.com/profile.php?id=61553896114681&locale=it_IT');
            }
          }}
          aria-label="Visita la pagina Facebook di Associazione Foro"
        >
          <div className="card-header">
            <div className="card-icon facebook-icon" aria-hidden="true">
              👥
            </div>
            <div className="card-info">
              <h3>Facebook</h3>
              <p>Associazione Foro</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleSocialClick('https://www.facebook.com/profile.php?id=61553896114681&locale=it_IT', e);
              }}
              className="visit-button"
              aria-label="Apri Facebook in una nuova scheda"
            >
              <ExternalLink size={16} />
            </button>
          </div>
          
          <div className="posts-container">
            {renderFacebookContent()}
          </div>
        </div>
      </div>
      
      {/* Telegram Bar */}
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
          <div className="telegram-icon" aria-hidden="true">
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
              <div className="status-dot" aria-hidden="true"></div>
              <span>Attivo</span>
            </div>
            <ExternalLink size={16} className="external-icon" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialSection;