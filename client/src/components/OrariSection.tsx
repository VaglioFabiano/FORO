import React, { useState, useEffect } from "react";
import "../style/orari.css";

interface FasciaOraria {
  id: number;
  giorno: string;
  ora_inizio: string;
  ora_fine: string;
  note?: string;
}

interface OrarioGiorno {
  giornoLabel: string; // Es: "Lunedì 24"
  giornoSettimana: string; // Es: "lunedì" (nome DB)
  dataCompleta: Date;
  fasce: FasciaOraria[];
  note?: string;
}

interface ApiResponse {
  success: boolean;
  // Supportiamo sia il formato array singolo che l'oggetto rolling combinato
  data: FasciaOraria[] | { current: FasciaOraria[]; next: FasciaOraria[] };
  message?: string;
}

const OrariSection: React.FC = () => {
  const [orariDisplay, setOrariDisplay] = useState<OrarioGiorno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Coordinate e indirizzo per Via Alfieri 4, Piossasco
  const latitude = 44.9876736673456;
  const longitude = 7.465713905723435;
  const address = "Via Alfieri 4, Piossasco (TO)";

  const handleMapClick = () => {
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(mapsUrl, "_blank");
  };

  const handleGetDirections = () => {
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(directionsUrl, "_blank");
  };

  // Funzione per verificare se un orario è straordinario
  const isOrarioStraordinario = (fasce: FasciaOraria[]): boolean => {
    if (fasce.length === 0) return false;
    if (fasce.length > 1) return true;
    const fascia = fasce[0];
    const oraInizio = fascia.ora_inizio.slice(0, 5);
    const oraFine = fascia.ora_fine.slice(0, 5);
    return !(oraInizio === "09:00" && oraFine === "19:30");
  };

  // Funzione per determinare la nota
  const determineNota = (fasce: FasciaOraria[]): string | undefined => {
    if (fasce.length === 0) return undefined;
    const noteUniche = fasce
      .map((fascia) => fascia.note?.trim())
      .filter((nota): nota is string => nota !== undefined && nota !== "")
      .filter((nota, index, array) => array.indexOf(nota) === index);
    return noteUniche.length > 0 ? noteUniche.join(" • ") : undefined;
  };

  // Mappa indice getDay() (0=Domenica) -> nome giorno DB (italiano)
  const getNomeGiornoItaliano = (dayIndex: number): string => {
    const days = [
      "domenica",
      "lunedì",
      "martedì",
      "mercoledì",
      "giovedì",
      "venerdì",
      "sabato",
    ];
    return days[dayIndex];
  };

  useEffect(() => {
    const fetchOrari = async () => {
      try {
        setLoading(true);
        setError(null);

        // Chiediamo la modalità "rolling" per avere current e next insieme
        const response = await fetch("/api/orari_settimana?settimana=rolling");
        const data: ApiResponse = await response.json();

        if (data.success && data.data && "current" in data.data) {
          const { current, next } = data.data;

          const oggi = new Date();
          const giorniGenerati: OrarioGiorno[] = [];

          // Calcoliamo il Lunedì della settimana CORRENTE
          const dayOfWeek = oggi.getDay();
          const diffToMonday = (dayOfWeek + 6) % 7;
          const currentWeekMonday = new Date(oggi);
          currentWeekMonday.setDate(oggi.getDate() - diffToMonday);
          currentWeekMonday.setHours(0, 0, 0, 0);

          // Calcoliamo il Lunedì della settimana PROSSIMA
          const nextWeekMonday = new Date(currentWeekMonday);
          nextWeekMonday.setDate(currentWeekMonday.getDate() + 7);

          // Loop per generare i prossimi 7 giorni (da oggi a oggi+6)
          for (let i = 0; i < 7; i++) {
            const dataTarget = new Date(oggi);
            dataTarget.setDate(oggi.getDate() + i);

            // Decidiamo da quale tabella prendere i dati
            const isNextWeek = dataTarget.getTime() >= nextWeekMonday.getTime();
            const sourceArray = isNextWeek ? next : current;

            const nomeGiorno = getNomeGiornoItaliano(dataTarget.getDay());

            // Filtriamo le fasce per quel giorno specifico
            const fasceDelGiorno = sourceArray.filter(
              (f) => f.giorno.toLowerCase() === nomeGiorno
            );

            // Formattiamo l'etichetta (es: "Lunedì 24")
            const options: Intl.DateTimeFormatOptions = {
              weekday: "long",
              day: "numeric",
            };
            const labelRaw = dataTarget.toLocaleDateString("it-IT", options);
            const labelCapitalized =
              labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1);

            giorniGenerati.push({
              giornoLabel: labelCapitalized,
              giornoSettimana: nomeGiorno,
              dataCompleta: dataTarget,
              fasce: fasceDelGiorno,
              note: determineNota(fasceDelGiorno),
            });
          }

          setOrariDisplay(giorniGenerati);
        } else {
          setError(data.message || "Formato dati non valido");
        }
      } catch (err) {
        setError("Errore di connessione nel caricamento degli orari");
        console.error("Errore nel fetch degli orari:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrari();
  }, []);

  // Calcola il titolo del periodo (Es: "24 Settembre - 30 Settembre")
  const getPeriodoTitle = (): string => {
    if (orariDisplay.length === 0) return "";
    const start = orariDisplay[0].dataCompleta;
    const end = orariDisplay[orariDisplay.length - 1].dataCompleta;

    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
    };
    const startStr = start.toLocaleDateString("it-IT", options);
    const endStr = end.toLocaleDateString("it-IT", options);

    return `${startStr} - ${endStr}`;
  };

  return (
    <section className="orari-full-width">
      <div className="orari-container">
        <div className="orari-header">
          <h2>Orari: {getPeriodoTitle()}</h2>
        </div>

        <div className="orari-content">
          <div className="orari-left">
            {loading ? (
              <div className="loading">Caricamento orari...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <div className="orari-list">
                {orariDisplay.map((item, index) => {
                  // --- FIX QUI: Definiamo se è oggi ---
                  const isToday = index === 0;

                  return (
                    <div
                      key={index}
                      // --- FIX QUI: Usiamo la classe 'oggi' invece di 'giorno-corrente' ---
                      className={`orario-item ${isOrarioStraordinario(item.fasce) ? "orario-straordinario" : ""} ${isToday ? "oggi" : ""}`}
                    >
                      <div className="testo">
                        <strong>
                          {item.giornoLabel}:
                          {/* --- FIX QUI: Aggiungiamo il badge visivo "OGGI" --- */}
                          {isToday && <span className="badge-oggi">OGGI</span>}
                        </strong>{" "}
                        {item.fasce.length === 0 ? (
                          <span className="chiuso">Chiuso</span>
                        ) : (
                          <>
                            {item.fasce.map((fascia, fasciaIndex) => (
                              <span
                                key={fasciaIndex}
                                className={
                                  fasciaIndex === 0
                                    ? "orario-principale"
                                    : "orario-serale"
                                }
                              >
                                {fasciaIndex > 0 && " + "}
                                {fascia.ora_inizio.slice(0, 5)} -{" "}
                                {fascia.ora_fine.slice(0, 5)}
                              </span>
                            ))}
                          </>
                        )}
                        {item.note && (
                          <span className="nota"> ({item.note})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Mappa della nostra sede"
                  ></iframe>
                </div>
              </div>

              <div className="address-info">
                <div className="address-card">
                  <div className="address-text">
                    <strong>{address}</strong>
                  </div>
                </div>

                <div className="map-buttons">
                  <div
                    className="orario-item"
                    onClick={handleGetDirections}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="testo">
                      <span className="material-symbols-outlined">
                        directions
                      </span>
                      <strong>Ottieni Indicazioni</strong>
                    </div>
                  </div>

                  <div
                    className="orario-item"
                    onClick={handleMapClick}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="testo">
                      <svg
                        className="map-icon"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z" />
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
