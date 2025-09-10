import React, { useState, useEffect } from 'react';
import '../style/orari.css';

interface FasciaOraria {
  id: number;
  giorno: string;
  ora_inizio: string;
  ora_fine: string;
  note?: string; // Aggiunto campo note opzionale
}

interface OrarioGiorno {
  giorno: string;
  fasce: FasciaOraria[];
  note?: string;
}

interface ApiResponse {
  success: boolean;
  data: any[];
  count?: number;
  message?: string;
}

const OrariSection: React.FC = () => {
  const [orari, setOrari] = useState<OrarioGiorno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lista completa dei giorni della settimana
  const tuttiGiorni = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

  // Coordinate e indirizzo per Via Alfieri 4, Piossasco
  const latitude = 44.9876736673456;
  const longitude = 7.465713905723435;
  const address = "Via Alfieri 4, Piossasco (TO)";

  const handleMapClick = () => {
    // Apri Google Maps con l'indirizzo
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(mapsUrl, '_blank');
  };

  const handleGetDirections = () => {
    // Apri Google Maps con le indicazioni stradali
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(directionsUrl, '_blank');
  };

  // Funzione per verificare se un orario è straordinario
  const isOrarioStraordinario = (fasce: FasciaOraria[]): boolean => {
    // Se non ci sono fasce (chiuso), non è straordinario
    if (fasce.length === 0) {
      return false;
    }

    // Se ci sono più fasce, è straordinario
    if (fasce.length > 1) {
      return true;
    }

    // Se c'è una sola fascia, controlla se è diversa dall'orario ordinario 9:00-19:30
    const fascia = fasce[0];
    const oraInizio = fascia.ora_inizio.slice(0, 5);
    const oraFine = fascia.ora_fine.slice(0, 5);
    
    return !(oraInizio === '09:00' && oraFine === '19:30');
  };

  // Funzione per raggruppare le fasce orarie per giorno
  const raggruppaOrariPerGiorno = (fasceOrarie: FasciaOraria[]): OrarioGiorno[] => {
    const gruppi: { [key: string]: FasciaOraria[] } = {};
    
    // Inizializza tutti i giorni con array vuoto
    tuttiGiorni.forEach(giorno => {
      gruppi[giorno] = [];
    });
    
    // Raggruppa le fasce orarie per giorno
    fasceOrarie.forEach(fascia => {
      if (gruppi[fascia.giorno]) {
        gruppi[fascia.giorno].push(fascia);
      }
    });

    return tuttiGiorni.map(giorno => ({
      giorno: giorno.charAt(0).toUpperCase() + giorno.slice(1),
      fasce: gruppi[giorno],
      note: determineNota(gruppi[giorno])
    }));
  };

  // Funzione migliorata per determinare la nota in base alle fasce orarie
  const determineNota = (fasce: FasciaOraria[]): string | undefined => {
    if (fasce.length === 0) {
      return undefined; // Nessuna nota per i giorni chiusi
    }
    
    console.log('Verificando note per fasce:', fasce);
    
    // Raccoglie tutte le note non vuote e uniche
    const noteUniche = fasce
      .map(fascia => {
        console.log(`Fascia ${fascia.id}: nota = "${fascia.note}"`);
        return fascia.note?.trim();
      })
      .filter((nota): nota is string => nota !== undefined && nota !== '')
      .filter((nota, index, array) => array.indexOf(nota) === index); // Rimuove duplicati
    
    console.log('Note uniche trovate:', noteUniche);
    
    // Se ci sono note, le unisce con un separatore
    const risultato = noteUniche.length > 0 ? noteUniche.join(' • ') : undefined;
    console.log('Risultato nota:', risultato);
    
    return risultato;
  };

  // Carica gli orari dal database
  useEffect(() => {
    const fetchOrari = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/orari_settimana');
        const data: ApiResponse = await response.json();
        
        if (data.success) {
          // Debug: log dei dati ricevuti
          console.log('Dati ricevuti dal database:', data.data);
          
          // Verifica se ci sono note nei dati
          const fasceConNote = data.data.filter(fascia => fascia.note && fascia.note.trim() !== '');
          console.log('Fasce con note trovate:', fasceConNote);
          
          const orariRaggruppati = raggruppaOrariPerGiorno(data.data);
          console.log('Orari raggruppati:', orariRaggruppati);
          
          setOrari(orariRaggruppati);
        } else {
          setError(data.message || 'Errore nel caricamento degli orari');
        }
      } catch (err) {
        setError('Errore di connessione nel caricamento degli orari');
        console.error('Errore nel fetch degli orari:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrari();
  }, []);

  // Funzione per ottenere il periodo corrente
  const getCurrentWeek = (): string => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = domenica, 1 = lunedì, ..., 6 = sabato
    
    // Calcola quanti giorni sottrarre per arrivare a lunedì
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    // Calcola la data del lunedì
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysToMonday);
    
    // Calcola la data della domenica (lunedì + 6 giorni)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // Ottieni il nome del mese
    const monthName = monday.toLocaleDateString('it-IT', { month: 'long' });
    
    // Se lunedì e domenica sono nello stesso mese
    if (monday.getMonth() === sunday.getMonth()) {
        return `${monday.getDate()}-${sunday.getDate()} ${monthName}`;
    } else {
        // Se la settimana attraversa due mesi
        const sundayMonthName = sunday.toLocaleDateString('it-IT', { month: 'long' });
        return `${monday.getDate()} ${monthName} - ${sunday.getDate()} ${sundayMonthName}`;
    }
  };

  return (
  <section className="orari-full-width">
    {/* IMPORTA IL FONT NEL HEAD O IN INDEX.HTML/ DOCUMENT */}
    <div className="orari-container">
      <div className="orari-header">
        <h2>Orari di Apertura {getCurrentWeek()}</h2>
      </div>

      <div className="orari-content">
        <div className="orari-left">
          {loading && orari.length === 0 ? (
            <div className="loading">Caricamento orari...</div>
          ) : error && orari.length === 0 ? (
            <div className="error">{error}</div>
          ) : (
            <div className="orari-list">
              {orari.map((item, index) => (
                <div 
                  key={index} 
                  className={`orario-item ${isOrarioStraordinario(item.fasce) ? 'orario-straordinario' : ''}`}
                >
                  <div className="testo">
                    <strong>{item.giorno}:</strong>{' '}
                    {item.fasce.length === 0 ? (
                      <span className="chiuso">Chiuso</span>
                    ) : (
                      <>
                        {item.fasce.map((fascia, fasciaIndex) => (
                          <span key={fasciaIndex} className={fasciaIndex === 0 ? "orario-principale" : "orario-serale"}>
                            {fasciaIndex > 0 && " + "}
                            {fascia.ora_inizio.slice(0, 5)} - {fascia.ora_fine.slice(0, 5)}
                          </span>
                        ))}
                      </>
                    )}
                    {item.note && <span className="nota"> ({item.note})</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="avviso">
            Disponibili le pagode per studiare all'aperto 
            <br />
            Rimanete collegatə per tutti gli aggiornamenti
          </div>
        </div>

        <div className="orari-right">
          <div className="mappa-container">
            <h3>Come Raggiungerci</h3>

            <div className="map-wrapper">
              <div className="interactive-map" onClick={handleMapClick}>
                <iframe
                  src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2822.5!2d${longitude}!3d${latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${latitude}%C2%B0N%20${longitude}%C2%B0E!5e0!3m2!1sit!2sit!4v1620000000000!5m2!1sit!2sit`}
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Mappa della nostra sede"
                ></iframe>
              </div>
            </div>

            <div className="address-info">
              <div className="orario-item">
                <div className="testo">
                  <strong>La Nostra Sede:</strong> {address}
                </div>
              </div>

              <div className="map-buttons">
                <div 
                  className="orario-item"
                  onClick={handleGetDirections}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="testo">
                    <span className="material-symbols-outlined map-icon">
                      directions
                    </span>
                    <strong>Ottieni Indicazioni</strong>
                  </div>
                </div>
                
                <div 
                  className="orario-item"
                  onClick={handleMapClick}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="testo">
                    <svg className="map-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z"/>
                    </svg>
                    <strong>Apri Google Maps</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

};

export default OrariSection;