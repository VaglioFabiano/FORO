import React from 'react';

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
    <section>
      <h2>Orari di Apertura</h2>
      <ul>
        {orari.map((item, index) => (
          <li key={index}>
            {item.icon} <strong>{item.giorno}:</strong> {item.orario}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default OrariSection;
