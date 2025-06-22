import React from 'react';
import { ExternalLink, MessageCircle } from 'lucide-react';
import '../style/social.css';

const SocialSection: React.FC = () => {

  const handleSocialClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="social-section">
      <h2 className="social-title">Seguici sui social</h2>
      
      {/* Riquadri Instagram e Facebook affiancati */}
      <div className="social-grid">
        {/* Instagram */}
        <div 
          className="social-card instagram-card"
          onClick={() => handleSocialClick('https://www.instagram.com/associazioneforo/')}
        >
          <div className="card-header">
            <div className="card-icon instagram-icon">📸</div>
            <div className="card-info">
              <h3>Instagram</h3>
              <p>@associazioneforo</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleSocialClick('https://www.instagram.com/associazioneforo/');
              }}
              className="visit-button"
            >
              <ExternalLink size={16} />
            </button>
          </div>
          
          <div className="posts-container">
            <div className="mock-posts">
              <div className="mock-post">
                <div className="post-header">
                  <div className="post-avatar"></div>
                  <div className="post-info">
                    <strong>associazioneforo</strong>
                    <span>• 2 giorni fa</span>
                  </div>
                </div>
                <div className="post-image"></div>
                <div className="post-content">
                  <p>🎓 Nuova sessione di studio aperta! Unisciti alla nostra community per prepararti al meglio...</p>
                  <div className="post-actions">
                    <span>❤️ 24</span>
                    <span>💬 5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Facebook */}
        <div 
          className="social-card facebook-card"
          onClick={() => handleSocialClick('https://www.facebook.com/profile.php?id=61553896114681&locale=it_IT')}
        >
          <div className="card-header">
            <div className="card-icon facebook-icon">👥</div>
            <div className="card-info">
              <h3>Facebook</h3>
              <p>Associazione Foro</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleSocialClick('https://www.facebook.com/profile.php?id=61553896114681&locale=it_IT');
              }}
              className="visit-button"
            >
              <ExternalLink size={16} />
            </button>
          </div>
          
          <div className="posts-container">
            <div className="mock-posts">
              <div className="mock-post">
                <div className="post-header">
                  <div className="post-avatar facebook-avatar"></div>
                  <div className="post-info">
                    <strong>Associazione Foro</strong>
                    <span>• 1 giorno fa</span>
                  </div>
                </div>
                <div className="post-content">
                  <p>📚 Importante aggiornamento sulle attività di questa settimana. Vi aspettiamo numerosi per le prossime sessioni di studio collaborative!</p>
                  <div className="post-actions">
                    <span>👍 18</span>
                    <span>💬 7</span>
                    <span>↗️ 3</span>
                  </div>
                </div>
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