import React, { useState, useEffect, useMemo } from "react";
import "../style/verbaliassemblea.css";
import { FcFolder, FcFile, FcLeft, FcBrokenLink } from "react-icons/fc";

// Interfaccia per i file restituiti da Google Drive API
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

const VerbaliAssemblea: React.FC = () => {
  // 1. Recupero le variabili d'ambiente
  // La tua chiave API (rinominata con VITE_)
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD;
  // Il link alla cartella root (che avevi già)
  const rootDriveLink = import.meta.env.VITE_GOOGLE_DRIVE_VERBALI || "";

  // 2. Estraggo l'ID della cartella Root
  const rootFolderId = useMemo(() => {
    if (!rootDriveLink) return null;
    const match = rootDriveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }, [rootDriveLink]);

  // Stato per la navigazione
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Imposta la cartella iniziale quando viene caricato l'ID root
  useEffect(() => {
    if (rootFolderId && !currentFolderId) {
      setCurrentFolderId(rootFolderId);
    }
  }, [rootFolderId]);

  // Fetch dei file da Google Drive API
  useEffect(() => {
    if (!currentFolderId || !apiKey) return;

    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        // Query: file dentro la cartella corrente, non nel cestino
        const query = `'${currentFolderId}' in parents and trashed=false`;

        // URL API: chiediamo solo id, nome, tipo e link per risparmiare banda
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query,
        )}&key=${apiKey}&fields=files(id,name,mimeType,webViewLink)&orderBy=folder,name`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        setFiles(data.files || []);
      } catch (err: any) {
        console.error("Errore Drive API:", err);
        setError(
          "Errore nel caricamento. Verifica la chiave API e i permessi della cartella.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [currentFolderId, apiKey]);

  // Gestione click: Entra in cartella o apre file
  const handleItemClick = (file: DriveFile) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      // Se è una cartella, aggiungi l'ID corrente alla storia e entra nella nuova
      setFolderHistory((prev) => [...prev, currentFolderId!]);
      setCurrentFolderId(file.id);
    } else {
      // Se è un file, aprilo in una nuova scheda
      window.open(file.webViewLink, "_blank");
    }
  };

  // Torna alla cartella precedente
  const handleBack = () => {
    if (folderHistory.length === 0) return;
    const previousId = folderHistory[folderHistory.length - 1];
    setFolderHistory((prev) => prev.slice(0, -1));
    setCurrentFolderId(previousId);
  };

  // Se mancano le configurazioni
  if (!apiKey || !rootFolderId) {
    return (
      <div className="verbali_container">
        <FcBrokenLink size={50} />
        <h3>Configurazione Mancante</h3>
        <p>
          Assicurati di avere VITE_GOOGLE_CLOUD e VITE_GOOGLE_DRIVE_VERBALI
          impostati.
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

      <div className="verbali_content">
        {/* Barra di navigazione */}
        <div
          className="verbali_actions"
          style={{ marginBottom: "15px", display: "flex", gap: "10px" }}
        >
          <button
            onClick={handleBack}
            disabled={folderHistory.length === 0}
            className="verbali_button_back"
            style={{
              opacity: folderHistory.length === 0 ? 0.5 : 1,
              cursor: folderHistory.length === 0 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <FcLeft /> Indietro
          </button>

          {folderHistory.length === 0 && (
            <span
              style={{ alignSelf: "center", fontSize: "0.9em", color: "#666" }}
            >
              Cartella Principale
            </span>
          )}
        </div>

        {/* Lista File */}
        {loading ? (
          <div className="verbali_loading">Caricamento in corso...</div>
        ) : error ? (
          <div className="verbali_error" style={{ color: "red" }}>
            {error}
          </div>
        ) : (
          <div className="verbali_list">
            {files.length === 0 && <p>Questa cartella è vuota.</p>}

            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => handleItemClick(file)}
                className="verbali_item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f9f9f9")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                {file.mimeType.includes("folder") ? (
                  <FcFolder size={24} />
                ) : (
                  <FcFile size={24} />
                )}

                <span
                  style={{
                    fontWeight: file.mimeType.includes("folder")
                      ? "600"
                      : "400",
                  }}
                >
                  {file.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="verbali_footer">
        <a
          href={rootDriveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="verbali_button"
        >
          Apri su Google Drive ↗
        </a>
      </div>
    </div>
  );
};

export default VerbaliAssemblea;
