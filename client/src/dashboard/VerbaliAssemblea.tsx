import React, { useState, useEffect, useMemo } from "react";
import "../style/verbaliassemblea.css";
// Assicurati di aver installato queste icone: npm install react-icons
import {
  FcFolder,
  FcFile,
  FcLeft,
  FcBrokenLink,
  FcOpenedFolder,
  FcDocument,
} from "react-icons/fc";
import { SiGoogledocs } from "react-icons/si";
import { IoClose, IoReload } from "react-icons/io5";

// Puoi passare il livello utente come prop (es. 1=Admin, 5=Ospite)
interface VerbaliProps {
  userLevel?: number;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

const VerbaliAssemblea: React.FC<VerbaliProps> = ({ userLevel = 1 }) => {
  // --- 1. CONFIGURAZIONE ---
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD;
  const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL; // L'URL /exec dello script
  const rootDriveLink = import.meta.env.VITE_GOOGLE_DRIVE_VERBALI || "";

  // La password segreta condivisa con lo script
  const appSecret = import.meta.env.VITE_APP_SECRET || "ASSOCIAZIONE_FORO_2026";

  // Chi può creare? Solo livello 1 e 2
  const canCreate = userLevel <= 2;

  // --- 2. STATO ---
  // Estrazione ID cartella root
  const rootFolderId = useMemo(() => {
    if (!rootDriveLink) return null;
    const match = rootDriveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }, [rootDriveLink]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);

  // Stati di caricamento e UI
  const [loading, setLoading] = useState(false); // Caricamento lista file
  const [creating, setCreating] = useState(false); // Overlay creazione in corso
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false); // Visibilità Popup

  // --- 3. LOGICA DI CARICAMENTO FILE ---
  const fetchFiles = async () => {
    if (!currentFolderId || !apiKey) return;
    setLoading(true);
    setError(null);
    try {
      // Query: file dentro la cartella corrente, non cestinati
      const query = `'${currentFolderId}' in parents and trashed=false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query,
      )}&key=${apiKey}&fields=files(id,name,mimeType,webViewLink)&orderBy=folder,name`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) throw new Error(data.error.message);
      setFiles(data.files || []);
    } catch (err: any) {
      console.error("Errore Drive:", err);
      setError("Impossibile caricare i file.");
    } finally {
      setLoading(false);
    }
  };

  // Imposta cartella iniziale al caricamento
  useEffect(() => {
    if (rootFolderId && !currentFolderId) setCurrentFolderId(rootFolderId);
  }, [rootFolderId]);

  // Ricarica i file quando cambia la cartella corrente
  useEffect(() => {
    fetchFiles();
  }, [currentFolderId, apiKey]);

  // --- 4. LOGICA NAVIGAZIONE ---
  const handleItemClick = (file: DriveFile) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      setFolderHistory((prev) => [...prev, currentFolderId!]);
      setCurrentFolderId(file.id);
    } else {
      window.open(file.webViewLink, "_blank");
    }
  };

  const handleBack = () => {
    if (folderHistory.length === 0) return;
    const previousId = folderHistory[folderHistory.length - 1];
    setFolderHistory((prev) => prev.slice(0, -1));
    setCurrentFolderId(previousId);
  };

  // --- 5. LOGICA CREAZIONE FILE (CHIAMATA ALLO SCRIPT) ---
  // Ora accetta anche il parametro "subtype" opzionale
  const handleCreateRealDoc = async (
    type: "direttivo" | "assemblea",
    subtype?: "ordinaria" | "straordinaria",
  ) => {
    if (!scriptUrl) {
      alert("Errore: Manca VITE_GOOGLE_SCRIPT_URL nel file .env");
      return;
    }

    setCreating(true); // Attiva overlay "Attendere prego..."
    setShowModal(false); // Chiude il modale

    try {
      // Inviamo i dati al tuo Google Script
      const response = await fetch(scriptUrl, {
        method: "POST",
        body: JSON.stringify({
          type: type, // "direttivo" o "assemblea"
          subtype: subtype || "ordinaria", // default a ordinaria se non specificato
          folderId: currentFolderId,
          secret: appSecret,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Successo!
        // 1. Apri il file appena creato in una nuova scheda
        window.open(data.url, "_blank");

        // 2. Ricarica la lista file dopo 2.5 secondi per far apparire il nuovo file
        setTimeout(() => fetchFiles(), 2500);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error("Risposta sconosciuta dal server");
      }
    } catch (err) {
      console.error("Errore creazione:", err);
      alert(
        "Errore durante la creazione. Controlla la console (F12) o verifica che lo script Google sia distribuito come 'Chiunque'.",
      );
    } finally {
      setCreating(false);
    }
  };

  // Se manca la configurazione base
  if (!apiKey || !rootFolderId)
    return (
      <div className="verbali_container error-state">
        <FcBrokenLink size={50} />
        <h3>Configurazione Mancante</h3>
        <p>Controlla VITE_GOOGLE_CLOUD e VITE_GOOGLE_DRIVE_VERBALI</p>
      </div>
    );

  return (
    <div className="verbali_container">
      {/* OVERLAY DI CARICAMENTO (Appare quando crei il file) */}
      {creating && (
        <div className="verbali_loading-overlay">
          <div className="spinner-large"></div>
          <h3>Creazione documento in corso...</h3>
          <p>Stiamo scrivendo il verbale e aprendo Google Drive.</p>
        </div>
      )}

      <div className="verbali_header">
        <FcFolder size={40} />
        <h2 className="verbali_title">Archivio Verbali</h2>
      </div>

      <div className="verbali_card">
        {/* BARRA NAVIGAZIONE */}
        <div className="verbali_nav">
          <div className="verbali_nav-left">
            <button
              onClick={handleBack}
              disabled={folderHistory.length === 0}
              className={`verbali_back-btn ${
                folderHistory.length === 0 ? "disabled" : ""
              }`}
            >
              <FcLeft size={20} /> <span>Indietro</span>
            </button>
            <span className="verbali_path">
              {folderHistory.length === 0 ? "Home" : "Sottocartella"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {/* Tasto Ricarica Manuale */}
            <button
              onClick={() => fetchFiles()}
              className="verbali_refresh-btn"
              title="Aggiorna lista"
            >
              <IoReload />
            </button>

            {/* Tasto Nuovo Verbale (Solo se autorizzato) */}
            {canCreate && (
              <button
                onClick={() => setShowModal(true)}
                className="verbali_create-btn"
              >
                <SiGoogledocs size={16} /> <span>Nuovo Verbale</span>
              </button>
            )}
          </div>
        </div>

        {/* LISTA FILE */}
        <div className="verbali_list-container">
          {loading ? (
            <div className="verbali_loading">
              <div className="spinner"></div>
              <p>Caricamento...</p>
            </div>
          ) : error ? (
            <div className="verbali_error">{error}</div>
          ) : (
            <div className="verbali_list">
              {files.length === 0 && (
                <div className="verbali_empty">
                  <FcOpenedFolder size={40} style={{ opacity: 0.5 }} />
                  <p>Cartella vuota</p>
                </div>
              )}

              {files.map((file) => {
                const isFolder = file.mimeType.includes("folder");
                return (
                  <div
                    key={file.id}
                    onClick={() => handleItemClick(file)}
                    className={`verbali_item ${
                      isFolder ? "is-folder" : "is-file"
                    }`}
                  >
                    <div className="verbali_item-icon">
                      {isFolder ? <FcFolder size={28} /> : <FcFile size={28} />}
                    </div>
                    <div className="verbali_item-info">
                      <span className="verbali_item-name">{file.name}</span>
                    </div>
                    {isFolder && <div className="verbali_chevron">›</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="verbali_footer">
        {!canCreate && <p>Accesso in sola lettura</p>}
      </div>

      {/* MODALE DI SELEZIONE (Popup) */}
      {showModal && (
        <div
          className="verbali_modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="verbali_modal">
            <button
              className="verbali_modal-close"
              onClick={() => setShowModal(false)}
            >
              <IoClose size={24} />
            </button>
            <h3>Crea Nuovo Verbale</h3>
            <p>Seleziona il modello da generare.</p>

            <div className="verbali_modal-actions">
              {/* BOTTONE 1: CONSIGLIO DIRETTIVO */}
              <button
                className="verbali_modal-btn direttivo"
                onClick={() => handleCreateRealDoc("direttivo")}
              >
                <div className="btn-icon">
                  <FcDocument size={32} />
                </div>
                <div className="btn-text">
                  <strong>Consiglio Direttivo</strong>
                  <span>Verbale riunione standard</span>
                </div>
              </button>

              {/* Separatore visivo */}
              <hr
                style={{
                  width: "100%",
                  border: "0",
                  borderTop: "1px solid #eee",
                  margin: "10px 0",
                }}
              />

              {/* BOTTONE 2: ASSEMBLEA ORDINARIA */}
              <button
                className="verbali_modal-btn assemblea"
                onClick={() => handleCreateRealDoc("assemblea", "ordinaria")}
              >
                <div className="btn-icon">
                  <FcDocument size={32} />
                </div>
                <div className="btn-text">
                  <strong>Assemblea Ordinaria [X]</strong>
                  <span>Convocazione Soci Ordinaria</span>
                </div>
              </button>

              {/* BOTTONE 3: ASSEMBLEA STRAORDINARIA */}
              <button
                className="verbali_modal-btn assemblea"
                onClick={() =>
                  handleCreateRealDoc("assemblea", "straordinaria")
                }
              >
                <div className="btn-icon">
                  <FcDocument size={32} />
                </div>
                <div className="btn-text">
                  <strong>Assemblea Straordinaria [X]</strong>
                  <span>Convocazione Soci Straordinaria</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerbaliAssemblea;
