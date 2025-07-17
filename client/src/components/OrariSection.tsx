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
  icona: string;
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

  // Mappa delle icone per ogni giorno
  const iconeGiorni: { [key: string]: string } = {
    'lunedì': '📚',
    'martedì': '📚',
    'mercoledì': '📚',
    'giovedì': '📚',
    'venerdì': '📚',
    'sabato': '📅',
    'domenica': '📅'
  };

  // Lista completa dei giorni della settimana
  const tuttiGiorni = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

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
      icona: iconeGiorni[giorno] || '📅',
      note: determineNota(gruppi[giorno])
    }));
  };

  // Funzione migliorata per determinare la nota in base alle fasce orarie
  const determineNota = (fasce: FasciaOraria[]): string | undefined => {
    if (fasce.length === 0) {
      return undefined; // Nessuna nota per i giorni chiusi
    }
    
    // Raccoglie tutte le note non vuote e uniche
    const noteUniche = fasce
      .map(fascia => fascia.note?.trim())
      .filter((nota): nota is string => nota !== undefined && nota !== '')
      .filter((nota, index, array) => array.indexOf(nota) === index); // Rimuove duplicati
    
    // Se ci sono note, le unisce con un separatore
    return noteUniche.length > 0 ? noteUniche.join(' • ') : undefined;
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
          const orariRaggruppati = raggruppaOrariPerGiorno(data.data);
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
      <div className="orari-container">
        <h2>Orari di Apertura {getCurrentWeek()}</h2>
        
        {loading && orari.length === 0 ? (
          <div className="loading">Caricamento orari...</div>
        ) : error && orari.length === 0 ? (
          <div className="error">❌ {error}</div>
        ) : (
          <div className="orari-list">
            {orari.map((item, index) => (
              <div key={index} className="orario-item">
                <span className="icona">{item.icona}</span>
                <div className="testo">
                  <strong>{item.giorno}:</strong> 
                  {item.fasce.length === 0 ? (
                    <span className="chiuso"> Chiuso</span>
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
          Disponibili le pagode per studiare all'aperto :) 
          <br />
          Rimanete collegatə per tutti gli aggiornamenti 😘
        </div>
      </div>
    </section>
  );
};

export default OrariSection;