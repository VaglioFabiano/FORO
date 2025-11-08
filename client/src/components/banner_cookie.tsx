import { useState, useEffect } from "react";
import { Cookie, X, ChevronRight, Shield, Lock, Eye } from "lucide-react";

const BannerCookie = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Controlla il consenso permanente (localStorage)
    const permConsent = localStorage.getItem("cookieConsent");
    // Controlla il consenso temporaneo (sessionStorage)
    const tempConsent = sessionStorage.getItem("cookieConsent");

    // Mostra il banner SOLO se l'utente non ha "accettato" (permanente)
    // E non ha "rifiutato" (temporaneo, per questa sessione)
    if (permConsent !== "accepted" && tempConsent !== "rejected") {
      setShowBanner(true);
      // Animazione di entrata ritardata
      setTimeout(() => setIsVisible(true), 100);
    }
  }, []);

  const handleAccept = () => {
    // Consenso permanente: salva in localStorage
    localStorage.setItem("cookieConsent", "accepted");
    // Rimuovi un eventuale rifiuto temporaneo
    sessionStorage.removeItem("cookieConsent");

    setIsVisible(false);
    setTimeout(() => setShowBanner(false), 300);
  };

  const handleReject = () => {
    // Consenso temporaneo: salva in sessionStorage
    // L'utente non sarà infastidito per questa sessione,
    // ma il banner riapparirà alla prossima visita.
    sessionStorage.setItem("cookieConsent", "rejected");

    setIsVisible(false);
    setTimeout(() => setShowBanner(false), 300);
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Overlay scuro quando i dettagli sono aperti */}
      {showDetails && <div className="cb-overlay" onClick={toggleDetails} />}

      <div className={`cb-container ${isVisible ? "cb-visible" : ""}`}>
        <div className="cb-relative-wrapper">
          {/* Gradiente superiore per sfumare nel contenuto */}
          <div className="cb-top-gradient" />

          <div
            className={`cb-main-content ${showDetails ? "cb-rounded-top" : ""}`}
          >
            <div className="cb-max-width-wrapper">
              {!showDetails ? (
                // Vista compatta moderna
                <div className="cb-compact-view">
                  {/* Icona e testo */}
                  <div className="cb-compact-text-group">
                    <div className="cb-icon-wrapper">
                      <Cookie className="cb-icon-cookie" />
                    </div>

                    <div className="cb-compact-text-content">
                      <h3 className="cb-compact-title">
                        Cookie e Privacy
                        <Shield className="cb-icon-shield" />
                      </h3>
                      <p className="cb-compact-description">
                        Utilizziamo solo cookie tecnici essenziali per garantire
                        il corretto funzionamento del sito.
                        <span className="cb-compact-description-sub">
                          {" "}
                          Nessun tracciamento, nessuna profilazione.
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Pulsanti azione */}
                  <div className="cb-compact-buttons">
                    <button
                      onClick={handleAccept}
                      className="cb-button cb-button-accept"
                    >
                      Accetta
                      <ChevronRight className="cb-button-icon" />
                    </button>

                    <button
                      onClick={handleReject}
                      className="cb-button cb-button-reject"
                    >
                      Rifiuta
                    </button>

                    <button
                      onClick={toggleDetails}
                      className="cb-button cb-button-details"
                    >
                      <Eye className="cb-button-icon-eye" />
                      Dettagli
                      <ChevronRight className="cb-button-icon-details" />
                    </button>
                  </div>
                </div>
              ) : (
                // Vista dettagli espansa
                <div className="cb-details-view">
                  {/* Header dettagli */}
                  <div className="cb-details-header">
                    <div className="cb-details-title-group">
                      <div className="cb-details-icon-wrapper">
                        <Shield className="cb-icon-shield-details" />
                      </div>
                      <h3 className="cb-details-title">Informativa Privacy</h3>
                    </div>
                    <button
                      onClick={toggleDetails}
                      className="cb-button-close"
                      aria-label="Chiudi dettagli"
                    >
                      <X className="cb-icon-close" />
                    </button>
                  </div>

                  {/* Contenuto scrollabile */}
                  <div className="cb-details-scroll-content">
                    {/* Sezione 1 */}
                    <div className="cb-details-card">
                      <div className="cb-details-card-header">
                        <div className="cb-card-icon-wrapper cb-card-icon-blue">
                          <Lock className="cb-card-icon" />
                        </div>
                        <div>
                          <h4 className="cb-card-title">
                            Gestione delle informazioni
                          </h4>
                          <p className="cb-card-text">
                            Questo sito utilizza esclusivamente cookie tecnici e
                            localStorage per garantire una navigazione fluida ed
                            efficiente.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sezione 2 */}
                    <div className="cb-details-card">
                      <h4 className="cb-card-title cb-flex">
                        <div className="cb-dot cb-dot-cyan" />
                        Cos'è il localStorage?
                      </h4>
                      <p className="cb-card-text cb-mb-3">
                        Il localStorage è uno spazio di memoria del tuo browser
                        che permette al sito di conservare informazioni
                        localmente:
                      </p>
                      <div className="cb-list-wrapper">
                        {[
                          "Non invia dati a server esterni",
                          "Non viene condiviso con terze parti",
                          "Migliora l'esperienza di navigazione",
                        ].map((item, idx) => (
                          <div key={idx} className="cb-list-item">
                            <ChevronRight className="cb-list-icon-cyan" />
                            <span className="cb-card-text">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sezione 3 */}
                    <div className="cb-details-card">
                      <h4 className="cb-card-title cb-flex">
                        <div className="cb-dot cb-dot-green" />
                        Finalità d'uso
                      </h4>
                      <div className="cb-list-wrapper">
                        {[
                          "Ricordare le preferenze di navigazione",
                          "Velocizzare il caricamento delle pagine",
                          "Evitare messaggi ripetitivi",
                        ].map((item, idx) => (
                          <div key={idx} className="cb-list-item-alt">
                            <div className="cb-list-icon-box">
                              <div className="cb-list-icon-dot" />
                            </div>
                            <span className="cb-card-text">{item}</span>
                          </div>
                        ))}
                      </div>
                      <p className="cb-card-text-italic">
                        Nessun tracciamento, profilazione o analisi
                        comportamentale.
                      </p>
                    </div>

                    {/* Sezione 4 */}
                    <div className="cb-details-card">
                      <h4 className="cb-card-title cb-flex">
                        <div className="cb-dot cb-dot-purple" />
                        Durata conservazione
                      </h4>
                      <div className="cb-list-wrapper cb-card-text">
                        <p>I dati memorizzati:</p>
                        <div className="cb-list-sub">
                          <p>• Rimangono solo sul tuo dispositivo</p>
                          <p>• Non vengono sincronizzati con server esterni</p>
                        </div>
                        <p className="cb-card-text-subtle cb-mt-2">
                          Puoi cancellarli manualmente dalle impostazioni del
                          browser.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer con azioni */}
                  <div className="cb-details-footer">
                    <button
                      onClick={handleAccept}
                      className="cb-button-footer cb-button-accept-details"
                    >
                      Accetta e Continua
                    </button>
                    <button
                      onClick={handleReject}
                      className="cb-button-footer cb-button-reject-details"
                    >
                      Rifiuta
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
          /* === Overlay === */
          .cb-overlay {
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            z-index: 40;
            transition-property: opacity;
            transition-duration: 300ms;
          }

          /* === Contenitore Principale === */
          .cb-container {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 50;
            transition: all 300ms ease-out;
            transform: translateY(100%);
            opacity: 0;
          }
          .cb-container.cb-visible {
            transform: translateY(0);
            opacity: 1;
          }

          /* === Wrapper Interni === */
          .cb-relative-wrapper {
            position: relative;
          }
          .cb-top-gradient {
            position: absolute;
            top: 0; /* Si attacca al main-content */
            left: 0;
            right: 0;
            height: 2rem; /* 32px */
            pointer-events: none;
            background: linear-gradient(to top, rgba(12, 73, 91, 0.95), transparent);
            transform: translateY(-100%); /* Sposta il gradiente sopra il box */
          }
          .cb-main-content {
            backdrop-filter: blur(16px);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.2), 0 -10px 10px -5px rgba(0, 0, 0, 0.1);
            background: linear-gradient(135deg, rgba(12, 73, 91, 0.98) 0%, rgba(12, 73, 91, 0.95) 50%, rgba(15, 85, 105, 0.95) 100%);
          }
          .cb-main-content.cb-rounded-top {
            border-top-left-radius: 1rem; /* 16px */
            border-top-right-radius: 1rem; /* 16px */
          }
          .cb-max-width-wrapper {
            max-width: 80rem; /* 1280px - max-w-7xl */
            margin-left: auto;
            margin-right: auto;
            padding: 1rem 1rem; /* 16px 16px */
          }
          @media (min-width: 640px) {
            .cb-max-width-wrapper {
              padding: 1rem 1.5rem; /* 16px 24px */
            }
          }
          @media (min-width: 1024px) {
            .cb-max-width-wrapper {
              padding: 1rem 2rem; /* 16px 32px */
            }
          }

          /* === Vista Compatta === */
          .cb-compact-view {
            display: flex;
            flex-direction: column;
            gap: 1rem; /* 16px */
          }
          @media (min-width: 1024px) {
            .cb-compact-view {
              flex-direction: row;
              align-items: center;
            }
          }
          .cb-compact-text-group {
            display: flex;
            align-items: flex-start;
            gap: 1rem; /* 16px */
            flex: 1;
          }
          .cb-icon-wrapper {
            flex-shrink: 0;
            width: 3rem; /* 48px */
            height: 3rem; /* 48px */
            background: linear-gradient(to bottom right, #3b82f6, #06b6d4);
            border-radius: 0.75rem; /* 12px */
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          .cb-icon-cookie {
            width: 1.5rem; /* 24px */
            height: 1.5rem; /* 24px */
            color: white;
          }
          .cb-compact-text-content {
            flex: 1;
            min-width: 0;
          }
          .cb-compact-title {
            color: white;
            font-weight: 700;
            font-size: 1.125rem; /* 18px */
            margin-bottom: 0.375rem; /* 6px */
            display: flex;
            align-items: center;
            gap: 0.5rem; /* 8px */
          }
          .cb-icon-shield {
            width: 1rem; /* 16px */
            height: 1rem; /* 16px */
            color: #4ade80; /* green-400 */
          }
          .cb-compact-description {
            color: #d1d5db; /* gray-300 */
            font-size: 0.875rem; /* 14px */
            line-height: 1.625;
          }
          .cb-compact-description-sub {
            color: #9ca3af; /* gray-400 */
          }

          /* === Pulsanti Compatti === */
          .cb-compact-buttons {
            display: flex;
            flex-direction: column;
            gap: 0.625rem; /* 10px */
            width: 100%;
          }
          @media (min-width: 640px) {
            .cb-compact-buttons {
              flex-direction: row;
            }
          }
          @media (min-width: 1024px) {
            .cb-compact-buttons {
              width: auto;
              flex-shrink: 0;
            }
          }

          .cb-button {
            padding-left: 1.5rem; /* 24px */
            padding-right: 1.5rem; /* 24px */
            padding-top: 0.625rem; /* 10px */
            padding-bottom: 0.625rem; /* 10px */
            border-radius: 0.75rem; /* 12px */
            font-weight: 600;
            transition: all 200ms;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem; /* 8px */
            cursor: pointer;
            border: none;
          }
          .cb-button-accept {
            background: linear-gradient(to right, #3b82f6, #06b6d4);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          .cb-button-accept:hover {
            background: linear-gradient(to right, #2563eb, #0891b2);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            transform: scale(1.05);
          }
          .cb-button-icon {
            width: 1rem; /* 16px */
            height: 1rem; /* 16px */
            transition: transform 150ms;
          }
          .cb-button-accept:hover .cb-button-icon {
            transform: translateX(2px);
          }
          .cb-button-reject {
            background-color: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(4px);
          }
          .cb-button-reject:hover {
            background-color: rgba(255, 255, 255, 0.2);
          }
          .cb-button-details {
            padding-left: 1rem; /* 16px */
            padding-right: 1rem; /* 16px */
            color: #d1d5db; /* gray-300 */
            font-size: 0.875rem; /* 14px */
            font-weight: 500;
            gap: 0.375rem; /* 6px */
            background: none;
          }
          .cb-button-details:hover {
            color: white;
          }
          .cb-button-icon-eye {
            width: 1rem; /* 16px */
            height: 1rem; /* 16px */
          }
          .cb-button-icon-details {
            width: 0.875rem; /* 14px */
            height: 0.875rem; /* 14px */
            transition: transform 150ms;
          }
          .cb-button-details:hover .cb-button-icon-details {
            transform: translateX(2px);
          }

          /* === Vista Dettagli === */
          .cb-details-view {
            color: white;
          }
          .cb-details-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem; /* 24px */
            padding-bottom: 1rem; /* 16px */
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          .cb-details-title-group {
            display: flex;
            align-items: center;
            gap: 0.75rem; /* 12px */
          }
          .cb-details-icon-wrapper {
            width: 2.5rem; /* 40px */
            height: 2.5rem; /* 40px */
            background: linear-gradient(to bottom right, #3b82f6, #06b6d4);
            border-radius: 0.5rem; /* 8px */
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .cb-icon-shield-details {
            width: 1.25rem; /* 20px */
            height: 1.25rem; /* 20px */
            color: white;
          }
          .cb-details-title {
            font-size: 1.5rem; /* 24px */
            font-weight: 700;
          }
          .cb-button-close {
            width: 2.5rem; /* 40px */
            height: 2.5rem; /* 40px */
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.5rem; /* 8px */
            transition: background-color 200ms;
            cursor: pointer;
            background: none;
            border: none;
            color: white;
          }
          .cb-button-close:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
          .cb-icon-close {
            width: 1.5rem; /* 24px */
            height: 1.5rem; /* 24px */
          }

          /* === Contenuto Dettagli === */
          .cb-details-scroll-content {
            max-height: 60vh;
            overflow-y: auto;
            padding-right: 0.5rem; /* 8px */
            display: grid;
            gap: 1.25rem; /* 20px */
          }
          
          /* === Scrollbar Custom === */
          .cb-details-scroll-content::-webkit-scrollbar {
            width: 6px;
          }
          .cb-details-scroll-content::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .cb-details-scroll-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
          }
          .cb-details-scroll-content::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          
          .cb-details-card {
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: 0.75rem; /* 12px */
            padding: 1rem; /* 16px */
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .cb-details-card-header {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem; /* 12px */
            margin-bottom: 0.75rem; /* 12px */
          }
          .cb-card-icon-wrapper {
            width: 2rem; /* 32px */
            height: 2rem; /* 32px */
            border-radius: 0.5rem; /* 8px */
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .cb-card-icon-blue {
            background-color: rgba(59, 130, 246, 0.2); /* blue-500/20 */
          }
          .cb-card-icon {
            width: 1rem; /* 16px */
            height: 1rem; /* 16px */
            color: #60a5fa; /* blue-400 */
          }
          .cb-card-title {
            font-weight: 600;
            font-size: 1.125rem; /* 18px */
            margin-bottom: 0.75rem; /* 12px */
          }
          .cb-card-title.cb-flex {
            display: flex;
            align-items: center;
            gap: 0.5rem; /* 8px */
          }
          .cb-card-text {
            color: #d1d5db; /* gray-300 */
            font-size: 0.875rem; /* 14px */
            line-height: 1.625;
          }
          .cb-card-text.cb-mb-3 {
            margin-bottom: 0.75rem; /* 12px */
          }
          .cb-card-text-subtle {
            color: #9ca3af; /* gray-400 */
            font-size: 0.875rem; /* 14px */
          }
          .cb-card-text-italic {
            color: #9ca3af; /* gray-400 */
            font-size: 0.875rem; /* 14px */
            margin-top: 0.75rem; /* 12px */
            font-style: italic;
          }

          /* === Elementi lista === */
          .cb-dot {
            width: 0.5rem; /* 8px */
            height: 0.5rem; /* 8px */
            border-radius: 9999px;
          }
          .cb-dot-cyan { background-color: #22d3ee; }
          .cb-dot-green { background-color: #4ade80; }
          .cb-dot-purple { background-color: #c084fc; }
          
          .cb-list-wrapper {
            display: grid;
            gap: 0.5rem; /* 8px */
          }
          .cb-list-item {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem; /* 8px */
          }
          .cb-list-icon-cyan {
            width: 1rem; /* 16px */
            height: 1rem; /* 16px */
            color: #22d3ee; /* cyan-400 */
            flex-shrink: 0;
            margin-top: 0.125rem; /* 2px */
          }
          
          .cb-list-item-alt {
            display: flex;
            align-items: center;
            gap: 0.5rem; /* 8px */
          }
          .cb-list-icon-box {
            width: 1.25rem; /* 20px */
            height: 1.25rem; /* 20px */
            background-color: rgba(34, 197, 94, 0.2); /* green-500/20 */
            border-radius: 0.25rem; /* 4px */
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .cb-list-icon-dot {
            width: 0.375rem; /* 6px */
            height: 0.375rem; /* 6px */
            background-color: #4ade80; /* green-400 */
            border-radius: 9999px;
          }
          .cb-list-sub {
            padding-left: 1rem; /* 16px */
            display: grid;
            gap: 0.375rem; /* 6px */
          }
          .cb-mt-2 { margin-top: 0.5rem; /* 8px */ }

          /* === Footer Dettagli === */
          .cb-details-footer {
            display: flex;
            flex-direction: column;
            gap: 0.75rem; /* 12px */
            margin-top: 1.5rem; /* 24px */
            padding-top: 1.25rem; /* 20px */
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
          @media (min-width: 640px) {
            .cb-details-footer {
              flex-direction: row;
            }
          }
          .cb-button-footer {
            flex: 1;
            padding: 0.75rem 1.5rem; /* 12px 24px */
            border-radius: 0.75rem; /* 12px */
            font-weight: 600;
            transition: all 200ms;
            cursor: pointer;
            border: none;
            font-size: 1rem; /* 16px */
          }
          .cb-button-accept-details {
            background: linear-gradient(to right, #3b82f6, #06b6d4);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          .cb-button-accept-details:hover {
            background: linear-gradient(to right, #2563eb, #0891b2);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }
          .cb-button-reject-details {
            background-color: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .cb-button-reject-details:hover {
            background-color: rgba(255, 255, 255, 0.2);
          }
        `}</style>
      </div>
    </>
  );
};

export default BannerCookie;
