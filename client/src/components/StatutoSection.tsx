import React, { useState } from 'react';

interface SezioneStatuto {
  titolo: string;
  contenuto: string;
  icon: string;
}

const StatutoSection: React.FC = () => {
  const [sezioneAperta, setSezioneAperta] = useState<number | null>(null);
  
  const sezioniStatuto: SezioneStatuto[] = [
    {
      titolo: 'Finalità dell\'Associazione',
      contenuto: 'L\'associazione promuove attività di studio collaborativo, formazione culturale e crescita personale attraverso la gestione di spazi dedicati e l\'organizzazione di eventi educativi che favoriscono l\'apprendimento e lo sviluppo delle competenze.',
      icon: '🎯'
    },
    {
      titolo: 'Attività Principali',
      contenuto: 'Gestione aula studio attrezzata, organizzazione gruppi di studio tematici, eventi formativi e culturali, workshop specializzati, supporto agli studenti universitari e delle scuole superiori, servizi di tutoring e mentoring.',
      icon: '📚'
    },
    {
      titolo: 'Membership e Adesione',
      contenuto: 'L\'associazione è aperta a studenti, professionisti e chiunque sia interessato alla crescita culturale e personale. La quota associativa annuale garantisce l\'accesso completo a tutti i servizi, spazi e attività organizzate.',
      icon: '👥'
    },
    {
      titolo: 'Governance e Organizzazione',
      contenuto: 'L\'associazione è guidata democraticamente da un Consiglio Direttivo eletto dall\'Assemblea dei Soci, che si riunisce almeno una volta all\'anno per le decisioni strategiche, l\'approvazione del bilancio e la pianificazione delle attività.',
      icon: '⚖️'
    }
  ];

  const handleToggleSezione = (index: number): void => {
    setSezioneAperta(sezioneAperta === index ? null : index);
  };

  return (
    <></>
  );
};

export default StatutoSection;