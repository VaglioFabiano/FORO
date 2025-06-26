import React from 'react';
import '../style/footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <h3>Contatti</h3>
        <div className="contact-info">
          <p><a href="mailto:associazioneforopiossasco@gmail.com">associazioneforopiossasco@gmail.com</a></p>
        </div>
        <div className="social-links">
          <a href="https://t.me/aulastudioforo" target="_blank" rel="noopener noreferrer">
            <span className="social-icon">📨</span> Telegram
          </a>
          <a href="https://www.instagram.com/associazioneforo/" target="_blank" rel="noopener noreferrer">
            <span className="social-icon">📷</span> Instagram
          </a>
          <a href="https://www.facebook.com/associazioneforopiossasco" target="_blank" rel="noopener noreferrer">
            <span className="social-icon">👍</span> Facebook
          </a>
        </div>
        <div className="copyright">
          <p>© {new Date().getFullYear()} FORO ETS. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;