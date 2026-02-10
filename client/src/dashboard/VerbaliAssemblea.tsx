import React, { useState, useEffect, useMemo } from "react";
import "../style/verbaliassemblea.css";
// Assicurati di aver installato: npm install react-icons
import {
  FcFolder,
  FcFile,
  FcLeft,
  FcBrokenLink,
  FcOpenedFolder,
  FcDocument,
} from "react-icons/fc";
import { SiGoogledocs } from "react-icons/si";
import { IoClose, IoReload, IoOpenOutline } from "react-icons/io5";

interface VerbaliProps {
  userLevel?: number;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

// MODIFICA IMPORTANTE: Default a 99 (sicurezza), non 1 (admin)
const VerbaliAssemblea: React.FC<VerbaliProps> = ({ userLevel = 99 }) => {
  // --- CONFIGURAZIONE ---
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD;
  const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
  const rootDriveLink = import.meta.env.VITE_GOOGLE_DRIVE_VERBALI || "";
  const appSecret = import.meta.env.VITE_APP_SECRET || "ASSOCIAZIONE_FORO_2026";

  // LOGICA PERMESSI: Livelli 0, 1 e 2 possono creare.
  // Assicuriamoci che sia un numero per evitare errori di stringhe
  const canCreate = Number(userLevel) <= 2;

  // Debug: Puoi vedere in console che livello sta leggendo
  // console.log("VerbaliAssemblea - User Level:", userLevel, "Can Create:", canCreate);

  // --- STATI ---
  const rootFolderId = useMemo(() => {
    if (!rootDriveLink) return null;
    const match = rootDriveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }, [rootDriveLink]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);

  // UI States
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modali
  const [showCreateModal, setShowCreateModal] = useState(false); // Popup Creazione
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null); // Popup Anteprima

  // --- FETCH DATI ---
  const fetchFiles = async () => {
    if (!currentFolderId || !apiKey) return;
    setLoading(true);
    setError(null);
    try {
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

  useEffect(() => {
    if (rootFolderId && !currentFolderId) setCurrentFolderId(rootFolderId);
  }, [rootFolderId]);

  useEffect(() => {
    fetchFiles();
  }, [currentFolderId, apiKey]);

  // --- NAVIGAZIONE ---
  const handleItemClick = (file: DriveFile) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      // Naviga nella cartella
      setFolderHistory((prev) => [...prev, currentFolderId!]);
      setCurrentFolderId(file.id);
    } else {
      // APRI ANTEPRIMA (non uscire dal sito)
      setPreviewFile(file);
    }
  };

  const handleBack = () => {
    if (folderHistory.length === 0) return;
    const previousId = folderHistory[folderHistory.length - 1];
    setFolderHistory((prev) => prev.slice(0, -1));
    setCurrentFolderId(previousId);
  };

  // --- CREAZIONE FILE (Script) ---
  const handleCreateRealDoc = async (
    type: "direttivo" | "assemblea",
    subtype?: "ordinaria" | "straordinaria",
  ) => {
    if (!scriptUrl) return alert("Manca Script URL (.env)");

    setCreating(true);
    setShowCreateModal(false);

    try {
      const response = await fetch(scriptUrl, {
        method: "POST",
        body: JSON.stringify({
          type,
          subtype: subtype || "ordinaria",
          folderId: currentFolderId,
          secret: appSecret,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Apri il file appena creato per modificarlo
        window.open(data.url, "_blank");
        // Aggiorna la lista
        setTimeout(() => fetchFiles(), 2500);
      } else {
        throw new Error(data.error || "Errore sconosciuto");
      }
    } catch (err) {
      console.error(err);
      alert("Errore creazione file.");
    } finally {
      setCreating(false);
    }
  };

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
      {/* 1. LOADING CREAZIONE */}
      {creating && (
        <div className="verbali_loading-overlay">
          <div className="spinner-large"></div>
          <h3>Creazione documento...</h3>
        </div>
      )}

      <div className="verbali_header">
        <FcFolder size={40} />
        <h2 className="verbali_title">Archivio Verbali</h2>
      </div>

      <div className="verbali_card">
        {/* HEADER CARD */}
        <div className="verbali_nav">
          <div className="verbali_nav-left">
            <button
              onClick={handleBack}
              disabled={folderHistory.length === 0}
              className={`verbali_back-btn ${folderHistory.length === 0 ? "disabled" : ""}`}
            >
              <FcLeft size={20} /> <span>Indietro</span>
            </button>
            <span className="verbali_path">
              {folderHistory.length === 0 ? "Home" : "Sottocartella"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => fetchFiles()}
              className="verbali_refresh-btn"
              title="Ricarica"
            >
              <IoReload />
            </button>
            {/* IL BOTTONE APPARE SOLO SE canCreate È TRUE */}
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
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
                  <p>Nessun documento</p>
                </div>
              )}
              {files.map((file) => {
                const isFolder = file.mimeType.includes("folder");
                return (
                  <div
                    key={file.id}
                    onClick={() => handleItemClick(file)}
                    className={`verbali_item ${isFolder ? "is-folder" : "is-file"}`}
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
        {!canCreate && <p>Modalità sola lettura</p>}
      </div>

      {/* 2. MODALE CREAZIONE */}
      {showCreateModal && (
        <div
          className="verbali_modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div className="verbali_modal">
            <button
              className="verbali_modal-close"
              onClick={() => setShowCreateModal(false)}
            >
              <IoClose size={24} />
            </button>
            <h3>Nuovo Verbale</h3>
            <div className="verbali_modal-actions">
              <button
                className="verbali_modal-btn direttivo"
                onClick={() => handleCreateRealDoc("direttivo")}
              >
                <div className="btn-icon">
                  <FcDocument size={32} />
                </div>
                <div className="btn-text">
                  <strong>Direttivo</strong>
                  <span>Verbale Standard</span>
                </div>
              </button>
              <hr
                style={{
                  width: "100%",
                  border: "0",
                  borderTop: "1px solid #eee",
                  margin: "10px 0",
                }}
              />
              <button
                className="verbali_modal-btn assemblea"
                onClick={() => handleCreateRealDoc("assemblea", "ordinaria")}
              >
                <div className="btn-icon">
                  <FcDocument size={32} />
                </div>
                <div className="btn-text">
                  <strong>Assemblea Ordinaria [X]</strong>
                  <span>Soci Ordinaria</span>
                </div>
              </button>
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
                  <span>Soci Straordinaria</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODALE ANTEPRIMA (Visualizzatore) */}
      {previewFile && (
        <div
          className="verbali_preview-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewFile(null);
          }}
        >
          <div className="verbali_preview-box">
            <div className="verbali_preview-header">
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <FcFile size={24} />
                <span className="preview-title">{previewFile.name}</span>
              </div>
              <div className="preview-actions">
                {/* Tasto per aprire esternamente se serve */}
                <a
                  href={previewFile.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="preview-external-link"
                  title="Apri su Drive"
                >
                  <IoOpenOutline size={20} />
                </a>
                <button
                  className="preview-close"
                  onClick={() => setPreviewFile(null)}
                >
                  <IoClose size={24} />
                </button>
              </div>
            </div>
            <div className="verbali_preview-content">
              <iframe
                src={`https://drive.google.com/file/d/${previewFile.id}/preview`}
                title="Anteprima"
                width="100%"
                height="100%"
                allow="autoplay"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerbaliAssemblea;
