interface Orario {
  giorno: string;
  orario: string;
  icon: string;
}

const OrariSection: React.FC = () => {
  const orari: Orario[] = [
    { giorno: 'Lunedì - Venerdì', orario: '08:00 - 22:00', icon: '📚' },
    { giorno: 'Sabato', orario: '09:00 - 20:00', icon: '📖' },
    { giorno: 'Domenica', orario: '10:00 - 18:00', icon: '☕' },
    { giorno: 'Festivi', orario: 'Chiuso', icon: '🎉' }
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-br from-amber-50 to-orange-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
      
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block p-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mb-6">
            <span className="text-4xl">📅</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800">
            Orari di Apertura
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto rounded-full mb-6"></div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            L'aula studio è aperta secondo i seguenti orari per offrirti la massima flessibilità
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {orari.map((item: Orario, index: number) => (
            <div key={index} className="group">
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-slate-100">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 mb-2">{item.giorno}</h3>
                  <p className="font-bold text-xl text-cyan-600">{item.orario}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-xl">ℹ️</span>
              </div>
              <h3 className="font-bold text-xl text-slate-800">Informazioni Importanti</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Durante i periodi di esame potrebbero essere applicati orari estesi. 
              Segui i nostri canali social per aggiornamenti in tempo reale e news importanti.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrariSection;