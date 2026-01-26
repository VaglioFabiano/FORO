import React, { useMemo } from "react";
import "../style/verbaliassemblea.css";
import { FcFolder, FcBrokenLink } from "react-icons/fc";

const VerbaliAssemblea: React.FC = () => {
  const driveLink = process.env.GOOGLE_DRIVE_VERBALI || "";

  // 2. Estrai l'ID della cartella dall'URL in modo sicuro
  const folderId = useMemo(() => {
    if (!driveLink) return null;

    // Cerca la stringa dopo "/folders/"
    const match = driveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }, [driveLink]);

  // URL per l'embed (vista lista)
  const embedUrl = folderId
    ? `https://drive.google.com/embeddedfolderview?id=${folderId}#list`
    : "";

  // Se la variabile d'ambiente non è settata, mostra un errore
  if (!driveLink || !folderId) {
    return (
      <div className="verbali_container">
        <FcBrokenLink size={50} />
        <h3 className="verbali_title">Configurazione Mancante</h3>
        <p className="verbali_description">
          L'URL della cartella Drive non è stato configurato correttamente nelle
          variabili d'ambiente.
        </p>
      </div>
    );
  }

  return (
    <div className="verbali_container">
      <div className="verbali_header">
        <FcFolder size={40} />
        <h2 className="verbali_title">Archivio Verbali Assemblea</h2>
      </div>

      <p className="verbali_description">
        In questa sezione puoi consultare lo storico dei verbali delle riunioni.
        Se non riesci a visualizzare i file qui sotto, usa il pulsante per
        aprire Google Drive.
      </p>

      <div className="verbali_iframe-wrapper">
        <iframe
          src={embedUrl}
          title="Archivio Verbali Drive"
          className="verbali_iframe"
          allowFullScreen
        />
      </div>

      <div className="verbali_footer">
        <a
          href={driveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="verbali_button"
        >
          Apri cartella su Google Drive ↗
        </a>
      </div>
    </div>
  );
};

export default VerbaliAssemblea;
