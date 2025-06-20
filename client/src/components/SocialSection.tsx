interface SocialChannel {
  nome: string;
  handle: string;
  descrizione: string;
  icon: string;
  color: string;
  hoverColor: string;
}

const SocialSection: React.FC = () => {
  const socialChannels: SocialChannel[] = [
    { 
      nome: 'Instagram', 
      handle: '@aulastudio_official', 
      descrizione: 'Foto e storie della vita quotidiana nella nostra community',
      icon: '📸',
      color: 'from-pink-500 to-purple-600',
      hoverColor: 'hover:from-pink-600 hover:to-purple-700'
    },
    { 
      nome: 'Facebook', 
      handle: 'Aula Studio Associazione', 
      descrizione: 'Eventi ufficiali e aggiornamenti importanti',
      icon: '👥',
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-700 hover:to-blue-800'
    },
    { 
      nome: 'Telegram', 
      handle: '@aulastudio_info', 
      descrizione: 'Comunicazioni rapide e organizzazione gruppi studio',
      icon: '💬',
      color: 'from-sky-500 to-blue-600',
      hoverColor: 'hover:from-sky-600 hover:to-blue-700'
    },
    { 
      nome: 'WhatsApp', 
      handle: 'Gruppo Aula Studio', 
      descrizione: 'Chat di comunità per organizzarsi e condividere',
      icon: '💚',
      color: 'from-green-500 to-emerald-600',
      hoverColor: 'hover:from-green-600 hover:to-emerald-700'
    }
  ];

  return (
    <section className="py-24 px-6 bg-white relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block p-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mb-6">
            <span className="text-4xl">🌐</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800">
            Seguici sui Social
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto rounded-full mb-6"></div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Resta sempre aggiornato e connettiti con la nostra vivace comunità di studenti
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {socialChannels.map((social: SocialChannel, index: number) => (
            <div key={index} className="group cursor-pointer">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-slate-200">
                <div className="flex items-start space-x-4">
                  <div className={`rounded-2xl w-16 h-16 flex items-center justify-center text-white text-2xl bg-gradient-to-br ${social.color} ${social.hoverColor} transition-all duration-300 group-hover:scale-110 shadow-lg`}>
                    {social.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-slate-800 mb-1">{social.nome}</h3>
                    <p className="font-semibold text-slate-600 mb-3">{social.handle}</p>
                    <p className="text-slate-500 leading-relaxed">{social.descrizione}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-8 shadow-lg border border-cyan-100">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-xl">🎯</span>
              </div>
              <h3 className="font-bold text-xl text-slate-800">Unisciti alla Comunità</h3>
            </div>
            <p className="text-slate-600 leading-relaxed max-w-3xl mx-auto">
              I nostri social non sono solo informativi: sono spazi di condivisione attiva dove 
              organizzare gruppi di studio, scambiarsi appunti, motivarsi a vicenda e creare legami duraturi!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialSection;