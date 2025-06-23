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
  const INSTAGRAM_USERNAME = 'associazioneforo';

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
      
      // Tentativo 1: Usa un servizio proxy per Instagram (esempio con un servizio pubblico)
      // Nota: In produzione dovresti usare la tua API backend
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.instagram.com/${INSTAGRAM_USERNAME}/`)}`;
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Instagram API non disponible');
      }
      
      const data = await response.json();
      
      // Parsing molto basilare - in produzione useresti l'API ufficiale
      // Questo è solo un esempio di fallback
      const htmlContent = data.contents;
      
      // Cerca i post nel HTML (questo è un approccio fragile, solo per demo)
      const postRegex = /"shortcode":"([^"]+)"/g;
      const matches = [];
      let match;
      
      while ((match = postRegex.exec(htmlContent)) !== null && matches.length < 3) {
        matches.push({
          id: match[1],
          permalink: `https://www.instagram.com/p/${match[1]}/`,
          media_type: 'IMAGE',
          timestamp: new Date().toISOString()
        });
      }
      
      if (matches.length > 0) {
        setInstagramPosts(matches);
      } else {
        throw new Error('Nessun post trovato');
      }
      
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
          <blockquote 
            key={post.id}
            className="instagram-media" 
            data-instgrm-permalink={post.permalink}
            data-instgrm-version="14"
          >
            <div className="instagram-embed-fallback">
              <div className="embed-header">
                <div className="embed-avatar"></div>
                <div className="embed-info">
                  <div className="embed-line"></div>
                  <div className="embed-line short"></div>
                </div>
              </div>
              <div className="embed-spacer"></div>
              <div className="embed-icon">
                <svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1">
                  <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                    <g transform="translate(-511.000000, -20.000000)" fill="#000000">
                      <path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path>
                    </g>
                  </g>
                </svg>
              </div>
              <div className="embed-text">
                <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                  Visualizza questo post su Instagram
                </a>
              </div>
            </div>
          </blockquote>
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