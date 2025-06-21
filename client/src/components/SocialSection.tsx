import React from 'react';

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
    <section>
      <h2 className="text-xl font-bold mb-4">Seguici sui social</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {socialChannels.map((channel, idx) => (
          <li
            key={idx}
            className={`p-4 rounded-xl text-white bg-gradient-to-r ${channel.color} transition ${channel.hoverColor}`}
          >
            <div className="text-2xl mb-1">{channel.icon} {channel.nome}</div>
            <div className="text-sm font-semibold">{channel.handle}</div>
            <p className="text-sm">{channel.descrizione}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SocialSection;
