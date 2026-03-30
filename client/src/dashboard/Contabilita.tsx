import React from "react";
import "../style/verbaliassemblea.css";
// Assicurati di aver installato: npm install react-icons
import { FcBarChart } from "react-icons/fc";
import { SiGooglesheets } from "react-icons/si";
import { IoOpenOutline } from "react-icons/io5";

const Contabilita: React.FC = () => {
  // ID estratto dal link fornito
  const sheetId = "1XbRRUG91LW3e_U___IPn090DNRAbGNTs";

  // URL per l'incorporamento pulito (preview)
  const embedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/preview`;

  // URL per aprire il file originale su una nuova scheda
  const externalUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing`;

  return (
    <div className="verbali_container">
      {/* HEADER */}
      <div className="verbali_header">
        <FcBarChart size={40} />
        <h2 className="verbali_title">Contabilità e Bilancio</h2>
      </div>

      {/* CARD PRINCIPALE */}
      <div
        className="verbali_card"
        style={{
          minHeight: "75vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* BARRA SUPERIORE */}
        <div className="verbali_nav">
          <div className="verbali_nav-left">
            <span className="verbali_path">
              Documento di riepilogo finanziario
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="verbali_back-btn"
              style={{ textDecoration: "none", color: "inherit" }}
              title="Apri in Fogli Google"
            >
              <SiGooglesheets color="#0f9d58" size={18} />
              <span>Apri Esternamente</span>
              <IoOpenOutline size={18} style={{ marginLeft: "4px" }} />
            </a>
          </div>
        </div>

        {/* VISUALIZZATORE IFRAME */}
        <div
          className="verbali_preview-content"
          style={{ flexGrow: 1, height: "100%", minHeight: "60vh" }}
        >
          <iframe
            src={embedUrl}
            title="Visualizzatore Contabilità"
            width="100%"
            height="100%"
            style={{ border: "none", display: "block" }}
            allow="autoplay"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default Contabilita;
