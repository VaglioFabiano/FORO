import React from 'react';
import '../style/orari.css';

interface Orario {
  giorno: string;
  orario: string;
  icona: string;
  nota?: string;
}

const OrariSection: React.FC = () => {
  const orariSettimana: Orario[] = [
    { giorno: 'Lunedì 23 giugno', orario: '09:00 - 19:30', icona: '📚' },
    { giorno: 'Martedì 24 giugno', orario: '09:00 - 19:30 + 21:00-24:00', icona: '🌙', nota: 'Apertura serale' },
    { giorno: 'Mercoledì 25 giugno', orario: '09:00 - 18:00', icona: '⚠️', nota: 'Chiusura anticipata' },
    { giorno: 'Giovedì 26 giugno', orario: '09:00 - 19:30 + 21:30-23:30', icona: '🌙', nota: 'Apertura serale' },
    { giorno: 'Venerdì 27 giugno', orario: '09:00 - 19:30', icona: '📚' }
  ];

  return (
    <section className="orari-full-width">
      <div className="orari-container">
        <h2>Orari di Apertura 23-27 giugno ☀️</h2>
        <div className="orari-list">
          {orariSettimana.map((item, index) => (
            <div key={index} className="orario-item">
              <span className="icona">{item.icona}</span>
              <div className="testo">
                <strong>{item.giorno}:</strong> {item.orario}
                {item.nota && <span className="nota"> ({item.nota})</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="avviso">
          Disponibili le pagode per studiare all'aperto :) 
          <br />
          Rimanete collegatə per tutti gli aggiornamenti 😘
        </div>
      </div>
    </section>
  );
};

export default OrariSection;