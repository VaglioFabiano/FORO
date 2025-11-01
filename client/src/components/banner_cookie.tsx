import { useState, useEffect } from "react";

const BannerCookie = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Controlla se l'utente ha già accettato o rifiutato i cookie
    const cookieConsent = localStorage.getItem("cookieConsent");
    // Mostra il banner solo se il consenso NON è stato dato
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    // Imposta il consenso e nasconde il banner
    localStorage.setItem("cookieConsent", "accepted");
    setShowBanner(false);
  };

  const handleReject = () => {
    // Imposta il rifiuto e nasconde il banner
    // NOTA: Se si utilizzano solo cookie tecnici, il rifiuto potrebbe non impedire
    // l'uso di localStorage (che non è un cookie), ma è buona prassi offrirlo.
    localStorage.setItem("cookieConsent", "rejected");
    setShowBanner(false);
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  if (!showBanner) return null;

  return (
    <div
      // Fissa il banner in basso e lo mette sopra tutto (z-50)
      className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        // Colore di sfondo scuro con trasparenza (0.85 alpha)
        backgroundColor: "rgba(31, 71, 99, 0.85)", // Corrisponde a hsla(194, 77%, 15%, 0.85)
        backdropFilter: "blur(10px)",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.3)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8 sm:py-6">
        {!showDetails ? (
          // Vista principale
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 text-white text-sm leading-relaxed">
              <p className="mb-2 font-semibold text-base">
                Questo sito utilizza cookie tecnici
              </p>
              <p className="text-white">
                Utilizziamo cookie esclusivamente per migliorare le prestazioni
                e il corretto funzionamento del sito (ad esempio per ricordare
                le tue preferenze e rendere la navigazione più efficiente). I
                dati generati da questi cookie rimangono memorizzati solo nel
                tuo browser e non vengono trasmessi a server esterni né
                utilizzati per finalità di profilazione o marketing.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0">
              <button
                onClick={handleAccept}
                className="px-6 py-2.5 bg-white text-blue-900 rounded-lg font-semibold hover:bg-white/90 transition-colors whitespace-nowrap shadow-md"
              >
                Accetta
              </button>
              <button
                onClick={handleReject}
                className="px-6 py-2.5 bg-transparent text-white border-2 border-white rounded-lg font-semibold hover:bg-white/20 transition-colors whitespace-nowrap"
              >
                Rifiuta
              </button>
              <button
                onClick={toggleDetails}
                className="px-6 py-2.5 bg-transparent text-white border-2 border-white/60 rounded-lg font-semibold hover:bg-white/20 transition-colors whitespace-nowrap"
              >
                Maggiori Informazioni
              </button>
            </div>
          </div>
        ) : (
          // Vista dettagli
          <div className="text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                Maggiori Informazioni
              </h3>
              <button
                onClick={toggleDetails}
                className="text-white hover:text-white/80 text-3xl leading-none font-light"
                aria-label="Chiudi dettagli"
              >
                &times;
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4 text-sm leading-relaxed">
              <div>
                <h4 className="font-semibold text-base mb-2 text-white">
                  Come vengono gestite le informazioni salvate nel tuo browser
                </h4>
                <p className="text-white">
                  Questo sito utilizza esclusivamente cookie tecnici e
                  tecnologie di archiviazione locale del browser (come il
                  localStorage) per garantire una navigazione più fluida ed
                  efficiente.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2 text-white">
                  Cos'è il localStorage?
                </h4>
                <p className="text-white mb-2">
                  Il localStorage è uno spazio di memoria del tuo browser che
                  permette al sito di conservare alcune informazioni
                  direttamente sul tuo dispositivo. A differenza dei cookie
                  tradizionali:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white ml-2">
                  <li>non invia dati a server esterni,</li>
                  <li>non viene condiviso con terze parti,</li>
                  <li>
                    può contenere informazioni utili a migliorare l'esperienza
                    di navigazione (come preferenze o impostazioni del sito).
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2 text-white">
                  Per cosa utilizziamo questa memoria locale
                </h4>
                <p className="text-white mb-2">
                  Le informazioni salvate servono esclusivamente a:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white ml-2">
                  <li>
                    ricordare le tue preferenze di navigazione (es. scelta dei
                    cookie, lingua o layout),
                  </li>
                  <li>
                    velocizzare il caricamento delle pagine fungendo da piccola
                    "cache locale",
                  </li>
                  <li>
                    evitare di mostrarti ripetutamente lo stesso avviso o
                    banner.
                  </li>
                </ul>
                <p className="text-white mt-2">
                  Non utilizziamo questi dati per tracciarti, profilarti o
                  analizzare il tuo comportamento a fini commerciali o
                  pubblicitari.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2 text-white">
                  Quanto restano salvate queste informazioni?
                </h4>
                <p className="text-white mb-2">
                  Le informazioni memorizzate nel browser:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white ml-2">
                  <li>rimangono esclusivamente sul tuo dispositivo,</li>
                  <li>
                    non vengono inviate o sincronizzate con il nostro server, né
                    con servizi esterni,
                  </li>
                  <li>
                    vengono automaticamente cancellate dopo un mese per
                    garantire la tua privacy e il corretto rinnovo
                    dell'esperienza di navigazione.
                  </li>
                </ul>
                <p className="text-white mt-2">
                  Puoi comunque cancellare manualmente in qualsiasi momento
                  questi dati tramite le impostazioni del tuo browser
                  (eliminando dati di navigazione → dati dei siti /
                  archiviazione locale).
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-white/30">
              <button
                onClick={handleAccept}
                className="px-6 py-2.5 bg-white text-blue-900 rounded-lg font-semibold hover:bg-white/90 transition-colors shadow-md"
              >
                Accetta
              </button>
              <button
                onClick={handleReject}
                className="px-6 py-2.5 bg-transparent text-white border-2 border-white rounded-lg font-semibold hover:bg-white/20 transition-colors"
              >
                Rifiuta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerCookie;
