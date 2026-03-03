import React from "react";
import { Calendar, MapPin, ArrowRight, Ticket } from "lucide-react";
import "../style/headerEvento.css";

interface HeaderEventoProps {
  evento: {
    id: number;
    titolo: string;
    descrizione: string;
    data_evento: string;
    immagine_blob?: string;
    immagine_url?: string;
  };
  onPrenotaClick: (id: number) => void;
}

const HeaderEvento: React.FC<HeaderEventoProps> = ({
  evento,
  onPrenotaClick,
}) => {
  const getImageUrl = () => evento.immagine_blob || evento.immagine_url || "";

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("it-IT", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <section className="hero-evento-wrapper">
      {/* Sfondo sfocato creato usando l'immagine dell'evento, con fix per gli apici nell'URL */}
      <div
        className="hero-evento-bg"
        style={{ backgroundImage: `url('${getImageUrl()}')` }}
      ></div>
      <div className="hero-evento-overlay"></div>

      <div className="hero-evento-container">
        <div className="hero-evento-content">
          <div className="hero-evento-badge">
            <span className="pulse-dot"></span>
            Prossimo Evento
          </div>

          <h1 className="hero-evento-title">{evento.titolo}</h1>

          <div className="hero-evento-meta">
            <div className="meta-item">
              <Calendar size={18} />
              <span>{formatDate(evento.data_evento)}</span>
            </div>
            <div className="meta-item">
              <MapPin size={18} />
              <span>Aula Studio Foro - Piossasco</span>
            </div>
          </div>

          <p className="hero-evento-desc">
            {evento.descrizione ||
              "Unisciti a noi per questo nuovo evento organizzato dall'Associazione Foro."}
          </p>

          <button
            className="hero-evento-btn"
            onClick={() => onPrenotaClick(evento.id)}
          >
            <Ticket size={20} />
            <span>Prenota il tuo posto</span>
            <ArrowRight size={18} className="arrow-icon" />
          </button>
        </div>

        <div className="hero-evento-visual">
          {getImageUrl() ? (
            <img
              src={getImageUrl()}
              alt={`Locandina ${evento.titolo}`}
              className="hero-evento-poster"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="hero-evento-placeholder">
              <Calendar size={64} opacity={0.3} />
              <span>Nessuna locandina</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeaderEvento;
