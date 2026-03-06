import React from "react";
import {
  Calendar,
  MapPin,
  ArrowRight,
  Ticket,
  Clock,
  ExternalLink,
} from "lucide-react";
import "../style/multiEventi.css";

interface EventoData {
  id: number;
  titolo: string;
  descrizione: string;
  data_evento: string;
  orario?: string;
  link_esterno?: string;
  immagine_blob?: string;
  immagine_url?: string;
}

interface MultiEventiProps {
  eventi: EventoData[];
  onPrenotaClick: (id: number) => void;
}

const MultiEventi: React.FC<MultiEventiProps> = ({
  eventi,
  onPrenotaClick,
}) => {
  const getImageUrl = (evento: EventoData) => {
    if (
      typeof evento.immagine_blob === "string" &&
      evento.immagine_blob.startsWith("data:image")
    ) {
      return evento.immagine_blob;
    }
    return evento.immagine_url || "";
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("it-IT", {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getValidUrl = (url?: string) => {
    if (!url) return "";
    return url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
  };

  return (
    <section className="multi-eventi-wrapper">
      <div className="multi-eventi-container">
        <h2 className="multi-eventi-section-title">I Nostri Prossimi Eventi</h2>

        <div className="multi-eventi-grid">
          {eventi.map((evento) => (
            <div key={evento.id} className="multi-evento-card">
              <div className="multi-evento-visual">
                {getImageUrl(evento) ? (
                  <img
                    src={getImageUrl(evento)}
                    alt={`Locandina ${evento.titolo}`}
                    className="multi-evento-poster"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="multi-evento-placeholder">
                    <Calendar size={48} opacity={0.3} />
                    <span>Nessuna locandina</span>
                  </div>
                )}
              </div>

              <div className="multi-evento-content">
                <h3 className="multi-evento-title">{evento.titolo}</h3>

                <div className="multi-evento-meta">
                  <div className="meta-item-small">
                    <Calendar size={16} />
                    <span>{formatDate(evento.data_evento)}</span>
                  </div>
                  {evento.orario && (
                    <div className="meta-item-small">
                      <Clock size={16} />
                      <span>{evento.orario}</span>
                    </div>
                  )}
                  <div className="meta-item-small">
                    <MapPin size={16} />
                    <span>Foro - Piossasco</span>
                  </div>
                </div>

                <p className="multi-evento-desc">
                  {evento.descrizione
                    ? evento.descrizione.length > 120
                      ? `${evento.descrizione.substring(0, 120)}...`
                      : evento.descrizione
                    : "Unisciti a noi per questo nuovo evento organizzato dall'Associazione Foro."}
                </p>

                <div className="multi-evento-actions">
                  <button
                    className="multi-evento-btn primary"
                    onClick={() => onPrenotaClick(evento.id)}
                  >
                    <Ticket size={18} />
                    <span>Prenota</span>
                    <ArrowRight size={16} className="arrow-icon" />
                  </button>

                  {evento.link_esterno && (
                    <button
                      className="multi-evento-btn secondary"
                      onClick={() =>
                        window.open(getValidUrl(evento.link_esterno), "_blank")
                      }
                    >
                      <ExternalLink size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MultiEventi;
