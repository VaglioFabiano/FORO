import React, { useState } from 'react'

interface SezioneStatuto {
  titolo: string;
  contenuto: string;
}

const StatutoSection: React.FC = () => {
  const [sezioneAperta, setSezioneAperta] = useState<number | null>(null)
  
  const sezioniStatuto: SezioneStatuto[] = [
    {
      titolo: 'Finalità dell\'Associazione',
      contenuto: 'L\'associazione promuove attività di studio collaborativo, formazione culturale e crescita personale attraverso la gestione di spazi dedicati e l\'organizzazione di eventi educativi.'
    },
    {
      titolo: 'Attività Principali',
      contenuto: 'Gestione aula studio, organizzazione gruppi di studio, eventi formativi, workshop tematici, supporto agli studenti universitari e delle scuole superiori.'
    },
    {
      titolo: 'Membership',
      contenuto: 'L\'associazione è aperta a studenti, professionisti e chiunque sia interessato alla crescita culturale. La quota associativa annuale garantisce l\'accesso a tutti i servizi.'
    },
    {
      titolo: 'Governance',
      contenuto: 'L\'associazione è guidata da un Consiglio Direttivo eletto dall\'Assemblea dei Soci, che si riunisce almeno una volta all\'anno per le decisioni strategiche.'
    }
  ]

  const handleToggleSezione = (index: number): void => {
    setSezioneAperta(sezioneAperta === index ? null : index)
  }

  return (
    <section className="py-20 px-6" style={{backgroundColor: 'rgb(249, 231, 202)'}}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{color: 'rgb(12, 73, 91)'}}>
            📋 Statuto dell'Associazione
          </h2>
          <p className="text-lg" style={{color: 'rgb(12, 73, 91)', opacity: 0.8}}>
            Trasparenza e chiarezza sui nostri principi e modalità operative
          </p>
        </div>
        
        <div className="space-y-4">
          {sezioniStatuto.map((sezione: SezioneStatuto, index: number) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => handleToggleSezione(index)}
                className="w-full px-6 py-4 text-left font-semibold hover:bg-gray-50 flex justify-between items-center"
                style={{color: 'rgb(12, 73, 91)'}}
              >
                <span>{sezione.titolo}</span>
                <span className="text-2xl">
                  {sezioneAperta === index ? '−' : '+'}
                </span>
              </button>
              {sezioneAperta === index && (
                <div className="px-6 pb-4 border-t border-gray-100">
                  <p className="pt-4" style={{color: 'rgb(12, 73, 91)', opacity: 0.8}}>{sezione.contenuto}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <div className="bg-white/50 rounded-lg p-6">
            <h3 className="font-semibold mb-2" style={{color: 'rgb(12, 73, 91)'}}>📄 Statuto Completo</h3>
            <p className="mb-4" style={{color: 'rgb(12, 73, 91)', opacity: 0.8}}>
              Il documento completo dello statuto è disponibile su richiesta presso la segreteria 
              dell'associazione o può essere scaricato dal nostro sito ufficiale.
            </p>
            <button className="text-white px-6 py-2 rounded-lg hover:opacity-90 transition-all" style={{backgroundColor: 'rgb(12, 73, 91)'}}>
              Scarica Statuto PDF
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default StatutoSection