import React, { useState, useEffect } from 'react';
import '../style/segnalazioni.css';

const Segnalazioni: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section className="segnalazioni-section" style={{ backgroundColor: 'rgb(254, 231, 203)' }}>
      <div className="container">
        <h2 style={{ color: 'rgb(12, 73, 91)' }}>Segnalazioni</h2>
        <div className="segnalazioni-content">
          <p style={{ color: 'rgb(12, 73, 91)', textAlign: 'center', marginBottom: '2rem', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
            Hai riscontrato problemi in aula o vuoi condividere un suggerimento per migliorare il nostro servizio? 
            Questo spazio è dedicato a te: segnalaci tutto ciò che ritieni importante!
          </p>
          
          {isMobile ? (
            <div className="mobile-form-container">
              <iframe 
                src="https://docs.google.com/forms/d/e/1FAIpQLSe0B8XCGyZVzPNKn56J-l-rWpzsTCuyPmdQR2iy9EXtfTGBiw/viewform?embedded=true" 
                width="100%" 
                height={654}
                frameBorder="0" 
                marginHeight={0} 
                marginWidth={0}
              >
                Caricamento…
              </iframe>
            </div>
          ) : (
            <div className="desktop-form-container">
              <div className="qr-code-container">
                <img 
                  src="../assets/qrcodeSegnalazioni.png" 
                  alt="QR Code per segnalazioni" 
                  className="qr-code-image"
                />
                <p style={{ color: 'rgb(12, 73, 91)', textAlign: 'center', marginTop: '1rem' }}>
                  Scansiona il QR code per accedere al form
                </p>
              </div>
              
              <div className="iframe-container">
                <iframe 
                  src="https://docs.google.com/forms/d/e/1FAIpQLSe0B8XCGyZVzPNKn56J-l-rWpzsTCuyPmdQR2iy9EXtfTGBiw/viewform?embedded=true" 
                  width={600} 
                  height={600}
                  frameBorder="0" 
                  marginHeight={0} 
                  marginWidth={0}
                >
                  Caricamento…
                </iframe>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Segnalazioni;