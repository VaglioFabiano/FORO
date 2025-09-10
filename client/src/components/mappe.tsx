import React from 'react';
import '../style/mappe.css';

const MappeSection: React.FC = () => {
  // Coordinate per Piossasco (esempio - sostituisci con l'indirizzo esatto)
  const latitude = 44.98761787252403;
  const longitude = 7.465689830836776;
  const address = "Via Example 123, Piossasco (TO)"; // Sostituisci con l'indirizzo reale

  const handleMapClick = () => {
    // Apri Google Maps con l'indirizzo
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(mapsUrl, '_blank');
  };

  const handleGetDirections = () => {
    // Apri Google Maps con le indicazioni stradali
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(directionsUrl, '_blank');
  };

  return (
    <section className="mappe-section">
      <div className="container">
        <div className="mappe-header">
          <h2 className="section-title">Come Raggiungerci</h2>
          <p className="section-subtitle">
            Trova facilmente la nostra sede
          </p>
        </div>

        <div className="mappe-content">
          <div className="map-container">
            <div className="interactive-map" onClick={handleMapClick}>
              <iframe
                src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2822.5!2d${longitude}!3d${latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${latitude}%C2%B0N%20${longitude}%C2%B0E!5e0!3m2!1sit!2sit!4v1620000000000!5m2!1sit!2sit`}
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mappa della nostra sede"
              ></iframe>
              <div className="map-overlay">
                <div className="map-click-hint">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z" />
                  </svg>
                  Clicca per aprire in Google Maps
                </div>
              </div>
            </div>
          </div>

          <div className="location-info">
            <div className="address-card">
              <div className="address-icon">
                <svg viewBox="0 0 24 24" width="32" height="32">
                  <path fill="currentColor" d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z" />
                </svg>
              </div>
              <div className="address-details">
                <h3>La Nostra Sede</h3>
                <p className="address">{address}</p>
                <p className="coordinates">
                  Coordinate: {latitude}°N, {longitude}°E
                </p>
              </div>
            </div>

            <div className="action-buttons">
              <button 
                className="btn-primary"
                onClick={handleGetDirections}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M21.71,11.29L12.71,2.29C12.32,1.9 11.69,1.9 11.3,2.29L2.29,11.29C1.9,11.68 1.9,12.31 2.29,12.7L11.3,21.71C11.69,22.1 12.32,22.1 12.71,21.71L21.71,12.7C22.1,12.31 22.1,11.68 21.71,11.29M13,17.5V14.5C9,14.5 6.5,16 5.5,19.5C5.5,15.5 7,12 13,12V9L18.5,12L13,17.5Z" />
                </svg>
                Ottieni Indicazioni
              </button>
              
              <button 
                className="btn-secondary"
                onClick={handleMapClick}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2M6.5,12.5L7.5,16.5L9.5,15.5L8.5,11.5L6.5,12.5M17.5,11.5L16.5,15.5L18.5,16.5L19.5,12.5L17.5,11.5Z" />
                </svg>
                Apri in Google Maps
              </button>
            </div>

            <div className="info-cards">
              <div className="info-card">
                <div className="info-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M18.92,6.01C18.72,5.42 18.16,5 17.5,5H15L13.5,2H10.5L9,5H6.5C5.84,5 5.28,5.42 5.08,6.01L3,12V20A1,1 0 0,0 4,21H20A1,1 0 0,0 21,20V12L18.92,6.01M12,17C9.24,17 7,14.76 7,12C7,9.24 9.24,7 12,7C14.76,7 17,9.24 17,12C17,14.76 14.76,17 12,17M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" />
                  </svg>
                </div>
                <div>
                  <h4>Parcheggio</h4>
                  <p>Disponibile nelle vicinanze</p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z" />
                  </svg>
                </div>
                <div>
                  <h4>Mezzi Pubblici</h4>
                  <p>Fermata bus nelle vicinanze</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MappeSection;