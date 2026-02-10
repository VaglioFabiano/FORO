import React, { useState, useEffect, useMemo } from "react";
import "../style/verbaliassemblea.css";
import {
  FcFolder,
  FcFile,
  FcLeft,
  FcBrokenLink,
  FcOpenedFolder,
} from "react-icons/fc";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

const VerbaliAssemblea: React.FC = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD;
  const rootDriveLink = import.meta.env.VITE_GOOGLE_DRIVE_VERBALI || "";

  const rootFolderId = useMemo(() => {
    if (!rootDriveLink) return null;
    const match = rootDriveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }, [rootDriveLink]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rootFolderId && !currentFolderId) {
      setCurrentFolderId(rootFolderId);
    }
  }, [rootFolderId]);

  useEffect(() => {
    if (!currentFolderId || !apiKey) return;

    const fetchFiles = async () => {
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
        console.error("Errore Drive API:", err);
        setError(
          "Errore nel caricamento. Verifica la chiave API e i permessi.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [currentFolderId, apiKey]);

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

  if (!apiKey || !rootFolderId) {
    return (
      <div className="verbali_container error-state">
        <FcBrokenLink size={60} />
        <h3>Configurazione Mancante</h3>
        <p>Verifica VITE_GOOGLE_CLOUD e VITE_GOOGLE_DRIVE_VERBALI.</p>
      </div>
    );
  }

  return (
    <div className="verbali_container">
      <div className="verbali_header">
        <div className="icon-wrapper">
          <FcFolder size={40} />
        </div>
        <h2 className="verbali_title">Archivio Verbali</h2>
      </div>

      <div className="verbali_card">
        {/* Barra di navigazione */}
        <div className="verbali_nav">
          <button
            onClick={handleBack}
            disabled={folderHistory.length === 0}
            className={`verbali_back-btn ${folderHistory.length === 0 ? "disabled" : ""}`}
          >
            <FcLeft size={20} />
            <span>Indietro</span>
          </button>

          <span className="verbali_path">
            {folderHistory.length === 0
              ? "Cartella Principale"
              : "Sottocartella"}
          </span>
        </div>

        {/* Contenuto Lista */}
        <div className="verbali_list-container">
          {loading ? (
            <div className="verbali_loading">
              <div className="spinner"></div>
              <p>Caricamento documenti...</p>
            </div>
          ) : error ? (
            <div className="verbali_error">{error}</div>
          ) : files.length === 0 ? (
            <div className="verbali_empty">
              <FcOpenedFolder size={40} style={{ opacity: 0.5 }} />
              <p>Questa cartella è vuota.</p>
            </div>
          ) : (
            <div className="verbali_list">
              {files.map((file) => {
                const isFolder = file.mimeType.includes("folder");
                return (
                  <div
                    key={file.id}
                    onClick={() => handleItemClick(file)}
                    className={`verbali_item ${isFolder ? "is-folder" : "is-file"}`}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="verbali_item-icon">
                      {isFolder ? <FcFolder size={28} /> : <FcFile size={28} />}
                    </div>

                    <div className="verbali_item-info">
                      <span className="verbali_item-name">{file.name}</span>
                      <span className="verbali_item-type">
                        {isFolder ? "Cartella" : "Documento"}
                      </span>
                    </div>

                    {/* Freccetta solo per le cartelle */}
                    {isFolder && <div className="verbali_chevron">›</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="verbali_footer">
        <a
          href={rootDriveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="verbali_drive-link"
        >
          Apri cartella originale su Drive ↗
        </a>
      </div>
    </div>
  );
};

export default VerbaliAssemblea;
