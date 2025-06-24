import React from 'react';
import statutoImage from '../assets/statuto.png';
import '../style/statuto.css';

const Statuto: React.FC = () => {
  const statutoDriveLink = "https://drive.google.com/file/d/19RWrdBR22kAbuwPdPwVjxxLjuTfzixaL/view?usp=sharing";

  return (
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
  );
};

export default Statuto;