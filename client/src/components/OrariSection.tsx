import React from 'react'

interface Orario {
  giorno: string;
  orario: string;
}

const OrariSection: React.FC = () => {
  const orari: Orario[] = [
    { giorno: 'Lunedì - Venerdì', orario: '08:00 - 22:00' },
    { giorno: 'Sabato', orario: '09:00 - 20:00' },
    { giorno: 'Domenica', orario: '10:00 - 18:00' },
    { giorno: 'Festivi', orario: 'Chiuso' }
  ]

  return (
    <section className="py-20 px-6" style={{backgroundColor: 'rgb(249, 231, 202)'}}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{color: 'rgb(12, 73, 91)'}}>
            📅 Orari di Apertura
          </h2>
          <p className="text-lg" style={{color: 'rgb(12, 73, 91)', opacity: 0.8}}>
            L'aula studio è aperta secondo i seguenti orari
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {orari.map((item: Orario, index: number) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg" style={{color: 'rgb(12, 73, 91)'}}>{item.giorno}</span>
                <span className="font-bold text-lg" style={{color: 'rgb(12, 73, 91)'}}>{item.orario}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <div className="bg-white/50 rounded-lg p-6">
            <h3 className="font-semibold mb-2" style={{color: 'rgb(12, 73, 91)'}}>ℹ️ Informazioni Importanti</h3>
            <p style={{color: 'rgb(12, 73, 91)', opacity: 0.8}}>
              Durante i periodi di esame potrebbero essere applicati orari estesi. 
              Segui i nostri canali social per aggiornamenti in tempo reale.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OrariSection