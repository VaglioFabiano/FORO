import React, { useState } from 'react';
import statutoImage from '../assets/statuto.png';
import '../style/statuto.css';

interface SezioneStatuto {
  titolo: string;
  contenuto: string;
  icon: string;
}

const Statuto: React.FC = () => {
  const [sezioneAperta, setSezioneAperta] = useState<number | null>(null);

  const sezioniStatuto: SezioneStatuto[] = [
    {
      titolo: "Finalità dell'Associazione",
      contenuto: "L'associazione promuove attività di studio collaborativo...",
      icon: '🎯',
    },
    {
      titolo: 'Attività Principali',
      contenuto: 'Gestione aula studio attrezzata, organizzazione gruppi...',
      icon: '📚',
    },
    {
      titolo: 'Membership e Adesione',
      contenuto: "L'associazione è aperta a studenti, professionisti...",
      icon: '👥',
    },
    {
      titolo: 'Governance e Organizzazione',
      contenuto: "L'associazione è guidata democraticamente da un Consiglio...",
      icon: '⚖️',
    },
  ];

  const handleToggleSezione = (index: number): void => {
    setSezioneAperta(sezioneAperta === index ? null : index);
  };

  const statutoDriveLink = "https://drive.google.com/file/d/19RWrdBR22kAbuwPdPwVjxxLjuTfzixaL/view?usp=sharing";

  return (
    <div className="statuto-container">
      {/* Sezione Banner */}
      <div className="statuto-banner">
        <div className="statuto-banner-content">
          {/* Parte sinistra con immagine cliccabile */}
          <div className="statuto-image-wrapper">
            <a href={statutoDriveLink} target="_blank" rel="noopener noreferrer">
              <img 
                src={statutoImage} 
                alt="Anteprima Statuto" 
                className="statuto-image"
              />
            </a>
          </div>
          
          {/* Parte destra con testo */}
          <div className="statuto-text-wrapper">
            <h2>Statuto dell'Associazione</h2>
            <p>
              Qui puoi consultare lo statuto che definisce i principi, gli obiettivi e il funzionamento 
              della nostra associazione. È il documento fondamentale che regola le nostre attività e 
              la partecipazione dei soci.
            </p>
            <a 
              href={statutoDriveLink} 
              target="_blank"
              rel="noopener noreferrer"
              className="statuto-download-btn"
            >
              Scarica lo Statuto
            </a>
          </div>
        </div>
      </div>

      {/* Sezioni espandibili */}
      <div className="statuto-sections">
        <h3>Principali contenuti:</h3>
        <div className="statuto-accordion">
          {sezioniStatuto.map((sezione, index) => (
            <div 
              key={index} 
              className={`statuto-accordion-item ${sezioneAperta === index ? 'open' : ''}`}
              onClick={() => handleToggleSezione(index)}
            >
              <div className="statuto-accordion-header">
                <span className="statuto-accordion-icon">{sezione.icon}</span>
                <h4>{sezione.titolo}</h4>
                <span className="statuto-accordion-toggle">
                  {sezioneAperta === index ? '−' : '+'}
                </span>
              </div>
              {sezioneAperta === index && (
                <div className="statuto-accordion-content">
                  <p>{sezione.contenuto}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Statuto;