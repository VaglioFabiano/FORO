import React from "react";
import "../style/contabilita.css";
import { FcBarChart } from "react-icons/fc";
import { SiGooglesheets } from "react-icons/si";
import { IoOpenOutline } from "react-icons/io5";

const Contabilita: React.FC = () => {
  const sheetId = "1XbRRUG91LW3e_U___IPn090DNRAbGNTs";

  // URL per l'incorporamento pulito
  const embedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/preview`;

  // URL per aprire il file originale su una nuova scheda
  const externalUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing`;

  return (
    <div className="contabilita_container">
      {/* HEADER */}
      <div className="contabilita_header">
        <FcBarChart size={40} />
        <h2 className="contabilita_title">Contabilità e Bilancio</h2>
      </div>

      {/* CARD PRINCIPALE */}
      <div className="contabilita_card">
        {/* BARRA SUPERIORE */}
        <div className="contabilita_nav">
          <div className="contabilita_nav-left">
            <span className="contabilita_path">
              Documento di riepilogo finanziario
            </span>
          </div>

          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="contabilita_external-btn"
            title="Apri in Fogli Google"
          >
            <SiGooglesheets color="#0f9d58" size={18} />
            <span>Apri Esternamente</span>
            <IoOpenOutline size={18} style={{ marginLeft: "4px" }} />
          </a>
        </div>

        {/* VISUALIZZATORE IFRAME */}
        <div className="contabilita_iframe-wrapper">
          <iframe
            src={embedUrl}
            title="Visualizzatore Contabilità"
            allow="autoplay"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default Contabilita;
