import React, { useEffect, useState } from 'react';
import '../style/associati.css';

const AssociatiSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const mediaItems = [
    { type: 'video', src: '../assets/associati1.mp4' },
    { type: 'image', src: '../assets/associati2.JPG' },
    { type: 'video', src: '../assets/associati3.mp4' }
  ];

  useEffect(() => {
    // Controlla se è mobile al montaggio e al ridimensionamento
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
    }, 10000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkMobile);
    };
  }, [mediaItems.length]);

  const handlePrev = () => {
    setActiveIndex((prevIndex) => 
      prevIndex === 0 ? mediaItems.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
  };

  return (
    <section className="sezione-associazione">
      <div className="testo-associazione">
        <h2>Chi siamo</h2>
        <p>Siamo un'associazione culturale attiva sul territorio, impegnata nell'organizzazione di iniziative e attività per la comunità. Dal 2022, grazie a diversi bandi comunali, gestiamo il servizio di aula studio, ma le nostre attività non si fermano lì.</p>
        <p>Vuoi far parte del progetto? Ti aspettiamo! Passa a trovarci in aula oppure scrivici a <a href="mailto:associazioneforopiossasco@gmail.com">associazioneforopiossasco@gmail.com</a> per diventare socio.</p>
      </div>
      
      <div className="carosello-media">
        {mediaItems.map((item, index) => (
          <div 
            key={index}
            className={`media-item ${index === activeIndex ? 'active' : ''}`}
          >
            {item.type === 'video' && isMobile ? (
              <img src={item.src.replace('.mp4', '.jpg')} alt={`Attività dell'associazione ${index + 1}`} />
            ) : item.type === 'video' ? (
              <video autoPlay loop muted playsInline>
                <source src={item.src} type="video/mp4" />
              </video>
            ) : (
              <img src={item.src} alt={`Attività dell'associazione ${index + 1}`} />
            )}
          </div>
        ))}
        
        <button className="carosello-btn prev" onClick={handlePrev}>&#10094;</button>
        <button className="carosello-btn next" onClick={handleNext}>&#10095;</button>
      </div>
    </section>
  );
};

export default AssociatiSection;