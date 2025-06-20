import React, { useState } from 'react'

const StatutoSection = () => {
  const [sezioneAperta, setSezioneAperta] = useState(null);
  
  const sezioniStatuto = [
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

  const handleToggleSezione = (index) => {
    setSezioneAperta(sezioneAperta === index ? null : index);
  };

  return (
    <section className="py-24 px-6 bg-gradient-to-br from-slate-50 to-slate-100 relative">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block p-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mb-6">
            <span className="text-4xl">📋</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800">
            Statuto dell'Associazione
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto rounded-full mb-6"></div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Trasparenza totale sui nostri principi, valori e modalità operative
          </p>
        </div>
        
        <div className="space-y-4 mb-12">
          {sezioniStatuto.map((sezione, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 transition-all duration-300 hover:shadow-xl">
              <button
                onClick={() => handleToggleSezione(index)}
                className="w-full px-8 py-6 text-left font-semibold hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 flex justify-between items-center transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-xl">{sezione.icon}</span>
                  </div>
                  <span className="text-slate-800 text-lg">{sezione.titolo}</span>
                </div>
                <div className={`text-3xl text-cyan-600 transition-transform duration-300 ${sezioneAperta === index ? 'rotate-45' : ''}`}>
                  +
                </div>
              </button>
              {sezioneAperta === index && (
                <div className="px-8 pb-6 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <p className="pt-6 text-slate-600 leading-relaxed text-lg">{sezione.contenuto}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-xl">📄</span>
              </div>
              <h3 className="font-bold text-xl text-slate-800">Statuto Completo</h3>
            </div>
            <p className="mb-6 text-slate-600 leading-relaxed">
              Il documento completo dello statuto è disponibile su richiesta presso la segreteria 
              dell'associazione o può essere scaricato direttamente dal nostro portale ufficiale.
            </p>
            <button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-full font-semibold hover:from-cyan-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-lg">
              📥 Scarica Statuto PDF
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatutoSection