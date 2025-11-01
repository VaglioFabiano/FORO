import { useState, useEffect } from "react";
import { Cookie, X, ChevronRight, Shield, Lock, Eye } from "lucide-react";

const BannerCookie = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const cookieConsent = localStorage.getItem("cookieConsent");
    if (!cookieConsent) {
      setShowBanner(true);
      // Animazione di entrata ritardata
      setTimeout(() => setIsVisible(true), 100);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setIsVisible(false);
    setTimeout(() => setShowBanner(false), 300);
  };

  const handleReject = () => {
    localStorage.setItem("cookieConsent", "rejected");
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
      {showDetails && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={toggleDetails}
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        <div className="relative">
          {/* Gradiente superiore per sfumare nel contenuto */}
          <div
            className="absolute top-0 left-0 right-0 h-8 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(12, 73, 91, 0.95), transparent)",
            }}
          />

          <div
            className={`backdrop-blur-xl border-t border-white/10 shadow-2xl ${
              showDetails ? "rounded-t-2xl" : ""
            }`}
            style={{
              background:
                "linear-gradient(135deg, rgba(12, 73, 91, 0.98) 0%, rgba(12, 73, 91, 0.95) 50%, rgba(15, 85, 105, 0.95) 100%)",
            }}
          >
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
              {!showDetails ? (
                // Vista compatta moderna
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                  {/* Icona e testo */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
                      <Cookie className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-lg mb-1.5 flex items-center gap-2">
                        Cookie e Privacy
                        <Shield className="w-4 h-4 text-green-400" />
                      </h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        Utilizziamo solo cookie tecnici essenziali per garantire
                        il corretto funzionamento del sito.
                        <span className="text-gray-400">
                          {" "}
                          Nessun tracciamento, nessuna profilazione.
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Pulsanti azione */}
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto flex-shrink-0">
                    <button
                      onClick={handleAccept}
                      className="group px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-500 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                    >
                      Accetta
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      onClick={handleReject}
                      className="px-6 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
                    >
                      Rifiuta
                    </button>

                    <button
                      onClick={toggleDetails}
                      className="px-4 py-2.5 text-gray-300 hover:text-white transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-1.5 group"
                    >
                      <Eye className="w-4 h-4" />
                      Dettagli
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              ) : (
                // Vista dettagli espansa
                <div className="text-white">
                  {/* Header dettagli */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold">
                        Informativa Privacy
                      </h3>
                    </div>
                    <button
                      onClick={toggleDetails}
                      className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors duration-200"
                      aria-label="Chiudi dettagli"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Contenuto scrollabile */}
                  <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                    {/* Sezione 1 */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Lock className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg mb-2">
                            Gestione delle informazioni
                          </h4>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            Questo sito utilizza esclusivamente cookie tecnici e
                            localStorage per garantire una navigazione fluida ed
                            efficiente.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sezione 2 */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                        Cos'è il localStorage?
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed mb-3">
                        Il localStorage è uno spazio di memoria del tuo browser
                        che permette al sito di conservare informazioni
                        localmente:
                      </p>
                      <div className="space-y-2">
                        {[
                          "Non invia dati a server esterni",
                          "Non viene condiviso con terze parti",
                          "Migliora l'esperienza di navigazione",
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-300 text-sm">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sezione 3 */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        Finalità d'uso
                      </h4>
                      <div className="space-y-2">
                        {[
                          "Ricordare le preferenze di navigazione",
                          "Velocizzare il caricamento delle pagine",
                          "Evitare messaggi ripetitivi",
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-5 h-5 bg-green-500/20 rounded flex items-center justify-center flex-shrink-0">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                            </div>
                            <span className="text-gray-300 text-sm">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-gray-400 text-sm mt-3 italic">
                        Nessun tracciamento, profilazione o analisi
                        comportamentale.
                      </p>
                    </div>

                    {/* Sezione 4 */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full" />
                        Durata conservazione
                      </h4>
                      <div className="space-y-2 text-gray-300 text-sm">
                        <p>I dati memorizzati:</p>
                        <div className="pl-4 space-y-1.5">
                          <p>• Rimangono solo sul tuo dispositivo</p>
                          <p>• Non vengono sincronizzati con server esterni</p>
                          <p>
                            • Vengono eliminati automaticamente dopo 30 giorni
                          </p>
                        </div>
                        <p className="text-gray-400 mt-2">
                          Puoi cancellarli manualmente dalle impostazioni del
                          browser.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer con azioni */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-5 border-t border-white/10">
                    <button
                      onClick={handleAccept}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Accetta e Continua
                    </button>
                    <button
                      onClick={handleReject}
                      className="flex-1 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200"
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
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </div>
    </>
  );
};

export default BannerCookie;
