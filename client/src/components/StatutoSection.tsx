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
      titolo: "Finalità dell'Associazione",
      contenuto:
        "L'associazione promuove attività di studio collaborativo, formazione culturale e crescita personale attraverso la gestione di spazi dedicati e l'organizzazione di eventi educativi che favoriscono l'apprendimento e lo sviluppo delle competenze.",
      icon: '🎯',
    },
    {
      titolo: 'Attività Principali',
      contenuto:
        'Gestione aula studio attrezzata, organizzazione gruppi di studio tematici, eventi formativi e culturali, workshop specializzati, supporto agli studenti universitari e delle scuole superiori, servizi di tutoring e mentoring.',
      icon: '📚',
    },
    {
      titolo: 'Membership e Adesione',
      contenuto:
        "L'associazione è aperta a studenti, professionisti e chiunque sia interessato alla crescita culturale e personale. La quota associativa annuale garantisce l'accesso completo a tutti i servizi, spazi e attività organizzate.",
      icon: '👥',
    },
    {
      titolo: 'Governance e Organizzazione',
      contenuto:
        "L'associazione è guidata democraticamente da un Consiglio Direttivo eletto dall'Assemblea dei Soci, che si riunisce almeno una volta all'anno per le decisioni strategiche, l'approvazione del bilancio e la pianificazione delle attività.",
      icon: '⚖️',
    },
  ];

  const handleToggleSezione = (index: number): void => {
    setSezioneAperta(sezioneAperta === index ? null : index);
  };

  return (
    <section>
      <h2 className="text-xl font-bold mb-4">Statuto dell'Associazione</h2>
      <ul className="space-y-4">
        {sezioniStatuto.map((sezione, index) => (
          <li
            key={index}
            className="border rounded-xl p-4 shadow transition cursor-pointer hover:bg-gray-50"
            onClick={() => handleToggleSezione(index)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span>{sezione.icon}</span>
                <span>{sezione.titolo}</span>
              </div>
              <span>{sezioneAperta === index ? '−' : '+'}</span>
            </div>
            {sezioneAperta === index && (
              <p className="mt-2 text-sm text-gray-700">{sezione.contenuto}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default StatutoSection;
