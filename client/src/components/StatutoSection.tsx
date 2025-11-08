import React, { useEffect, useState } from "react";
import { Edit } from "lucide-react";
import statutoImageFallback from "../assets/statuto.png";
import "../style/statuto.css";

// --- LOGICA CACHE BASATA SU VERSIONE ---
const CACHE_VERSION_KEY = "cachedHomepageVersion";
const CACHE_DATA_KEY = "cachedHomepageData"; // Cache per l'intera risposta /api/homepage
const CACHE_HEADER_KEY = "cachedHeaderData";
const CACHE_SEGNALAZIONI_KEY = "cachedSegnalazioniData";

const getCachedVersion = () => {
  if (localStorage.getItem("cookieConsent") !== "accepted") return null;
  return localStorage.getItem(CACHE_VERSION_KEY);
};

const getCachedData = (key: string) => {
  if (localStorage.getItem("cookieConsent") !== "accepted") return null;
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : null;
};

const setCachedVersion = (version: string | number) => {
  if (localStorage.getItem("cookieConsent") !== "accepted") return;
  localStorage.setItem(CACHE_VERSION_KEY, String(version));
};

const setCachedData = (key: string, data: any) => {
  if (localStorage.getItem("cookieConsent") !== "accepted") return;
  localStorage.setItem(key, JSON.stringify(data));
};

const invalidateHomepageCache = () => {
  console.log("Invalidating all homepage cache...");
  localStorage.removeItem(CACHE_VERSION_KEY);
  localStorage.removeItem(CACHE_DATA_KEY);
  localStorage.removeItem(CACHE_HEADER_KEY);
  localStorage.removeItem(CACHE_SEGNALAZIONI_KEY);
};
// --- FINE LOGICA CACHE ---

interface StatutoData {
  link_drive: string;
  anteprima: string;
}

interface User {
  id: number;
  level: number;
}

const Statuto: React.FC = () => {
  const [statutoData, setStatutoData] = useState<StatutoData>({
    link_drive: "",
    anteprima: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<StatutoData>({
    link_drive: "",
    anteprima: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Link di fallback
  const fallbackDownloadLink =
    "https://drive.google.com/file/d/19RWrdBR22kAbuwPdPwVjxxLjuTfzixaL/view?usp=sharing";
  const fallbackPreviewLink =
    "https://drive.google.com/file/d/13NQvWyiiOdIMEdEFN0jIe4VByXn_-zKN/view?usp=drive_link";
  const fallbackStatutoData = {
    link_drive: fallbackDownloadLink,
    anteprima: fallbackPreviewLink,
  };

  useEffect(() => {
    loadStatutoData();
    checkUserPermissions();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const checkUserPermissions = () => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
      } catch (error) {
        console.error("Errore nel parsing user data:", error);
      }
    }
  };

  const processStatutoData = (statuto: any) => {
    const linkDrive = statuto?.link_drive || fallbackDownloadLink;
    const anteprima = statuto?.anteprima || fallbackPreviewLink;
    setStatutoData({ link_drive: linkDrive, anteprima: anteprima });
    setEditData({ link_drive: linkDrive, anteprima: anteprima });
  };

  const loadStatutoData = async () => {
    setIsLoading(true);

    // --- LOGICA CACHE ---
    const cookieConsent = localStorage.getItem("cookieConsent");
    const localVersion = getCachedVersion();
    const cachedData = getCachedData(CACHE_DATA_KEY); // Usa la cache completa

    if (
      cookieConsent === "accepted" &&
      localVersion &&
      cachedData &&
      cachedData.statuto
    ) {
      console.log("Loading Statuto from cache");
      processStatutoData(cachedData.statuto);
      setIsLoading(false);
      return;
    }
    // --- FINE LOGICA CACHE ---

    try {
      console.log("Fetching fresh data for Homepage (Statuto)");
      const response = await fetch("/api/homepage");
      const data = await response.json();

      if (data.success) {
        processStatutoData(data.statuto);
        // --- LOGICA CACHE ---
        setCachedData(CACHE_DATA_KEY, data);
        setCachedData(CACHE_HEADER_KEY, data.header?.descrizione);
        setCachedData(CACHE_SEGNALAZIONI_KEY, data.segnalazioni);
        setCachedVersion(data.header?.version);
        // --- FINE LOGICA CACHE ---
      } else {
        processStatutoData(null); // Usa fallback
      }
    } catch (error) {
      console.error("Errore nel caricamento dati statuto:", error);
      processStatutoData(null); // Usa fallback
      setMessage({
        type: "error",
        text: "Errore nel caricamento dati dello statuto",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(statutoData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(statutoData);
  };

  const isValidGoogleDriveUrl = (url: string): boolean => {
    if (!url) return true; // Permetti campo vuoto
    return url.includes("drive.google.com") && url.includes("/file/d/");
  };

  const handleSave = async () => {
    if (!currentUser) {
      setMessage({
        type: "error",
        text: "Devi essere loggato per modificare lo statuto",
      });
      return;
    }

    // Validazione URL
    if (editData.link_drive && !isValidGoogleDriveUrl(editData.link_drive)) {
      setMessage({
        type: "error",
        text: "Inserisci un link valido di Google Drive per il download",
      });
      return;
    }

    if (editData.anteprima && !isValidGoogleDriveUrl(editData.anteprima)) {
      setMessage({
        type: "error",
        text: "Inserisci un link valido di Google Drive per l'anteprima",
      });
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch("/api/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "statuto",
          data: editData,
          user_id: currentUser.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatutoData(editData);
        setIsEditing(false);
        setMessage({
          type: "success",
          text: "Link dello statuto aggiornato con successo!",
        });
        // --- LOGICA CACHE ---
        invalidateHomepageCache(); // Invalida tutta la cache
        // --- FINE LOGICA CACHE ---
      } else {
        throw new Error(data.error || "Errore nel salvataggio");
      }
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      setMessage({
        type: "error",
        text: "Errore durante il salvataggio del link dello statuto",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const extractFileIdFromDriveUrl = (url: string): string | null => {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const getImagePreviewUrl = (driveUrl: string): string => {
    // Se non c'è URL anteprima, usa l'immagine di fallback locale
    if (!driveUrl) return statutoImageFallback;

    const fileId = extractFileIdFromDriveUrl(driveUrl);
    if (fileId) {
      // Usa il formato thumbnail di Google Drive per le immagini
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`;
    }
    return statutoImageFallback;
  };

  const canEdit =
    currentUser &&
    (currentUser.level === 0 ||
      currentUser.level === 1 ||
      currentUser.level === 2);

  const renderEditModal = () => {
    // ...il resto del tuo JSX (invariato) ...
    if (!isEditing) return null;

    return (
      <div className="statuto-edit-modal-overlay" onClick={handleCancel}>
           {" "}
        <div
          className="statuto-edit-modal"
          onClick={(e) => e.stopPropagation()}
        >
             {" "}
          <div className="modal-header">
                <h3>Modifica Statuto</h3>   {" "}
            <button className="close-button" onClick={handleCancel}>
              ×
            </button>
               {" "}
          </div>
                 {" "}
          <div className="modal-body">
               {" "}
            <div className="form-group">
                 {" "}
              <label htmlFor="drive-link">
                Link Google Drive dello Statuto (Download)
              </label>
                 {" "}
              <input
                id="drive-link"
                type="url"
                value={editData.link_drive}
                onChange={(e) =>
                  setEditData({ ...editData, link_drive: e.target.value })
                }
                placeholder="https://drive.google.com/file/d/..."
                disabled={isSaving}
              />
                 {" "}
              <small>
                    Link del file PDF dello statuto per il download. Deve essere
                pubblico.    {" "}
              </small>
                 {" "}
            </div>
                   {" "}
            <div className="form-group">
                 {" "}
              <label htmlFor="anteprima-link">
                Link Google Drive Anteprima Immagine
              </label>
                 {" "}
              <input
                id="anteprima-link"
                type="url"
                value={editData.anteprima}
                onChange={(e) =>
                  setEditData({ ...editData, anteprima: e.target.value })
                }
                placeholder="https://drive.google.com/file/d/..."
                disabled={isSaving}
              />
                 {" "}
              <small>
                    Link dell'immagine di anteprima dello statuto. Deve essere
                un'immagine (JPG, PNG) pubblica su Google Drive.    {" "}
              </small>
                 {" "}
            </div>
                       {" "}
          </div>
                 {" "}
          <div className="modal-actions">
               {" "}
            <button
              className="cancel-button"
              onClick={handleCancel}
              disabled={isSaving}
            >
                  Annulla    {" "}
            </button>
               {" "}
            <button
              className="save-button"
              onClick={handleSave}
              disabled={
                isSaving ||
                (!!editData.link_drive &&
                  !isValidGoogleDriveUrl(editData.link_drive)) ||
                (!!editData.anteprima &&
                  !isValidGoogleDriveUrl(editData.anteprima))
              }
            >
                  {isSaving ? "Salvando..." : "Salva"}   {" "}
            </button>
               {" "}
          </div>
             {" "}
        </div>
           {" "}
      </div>
    );
  };

  if (isLoading) {
    // ...il resto del tuo JSX (invariato) ...
    return (
      <div className="statuto-container">
           {" "}
        <div className="statuto-banner">
             {" "}
          <div className="statuto-loading">
                <p>Caricamento statuto...</p>   {" "}
          </div>
             {" "}
        </div>
           {" "}
      </div>
    );
  }

  const currentDownloadLink = statutoData.link_drive || fallbackDownloadLink;
  const currentPreviewLink = statutoData.anteprima || fallbackPreviewLink;

  return (
    // ...il resto del tuo JSX (invariato) ...
    <div className="statuto-container">
       {" "}
      <div className="statuto-banner">
         {" "}
        <div className="statuto-banner-content">
           {" "}
          {canEdit && (
            <button className="edit-statuto-button" onClick={handleEdit}>
                <Edit size={16} />  Modifica Statuto  {" "}
            </button>
          )}
           {" "}
          {message && (
            <div className={`statuto-message ${message.type}`}>
                <span>{message.text}</span> {" "}
              <button onClick={() => setMessage(null)}>×</button> {" "}
            </div>
          )}
           {" "}
          <div className="statuto-image-wrapper">
             {" "}
            <a
              href={currentDownloadLink}
              target="_blank"
              rel="noopener noreferrer"
            >
               {" "}
              <img
                src={getImagePreviewUrl(currentPreviewLink)}
                alt="Anteprima Statuto"
                className="statuto-image"
                onError={(e) => {
                  // Fallback all'immagine locale se Google Drive fallisce
                  const target = e.target as HTMLImageElement;
                  target.src = statutoImageFallback;
                }}
              />
               {" "}
            </a>
             {" "}
          </div>
             {" "}
          <div className="statuto-text-wrapper">
              <h2>Statuto dell'Associazione</h2> {" "}
            <p>
                Qui puoi consultare lo statuto che definisce i principi, gli
              obiettivi e il funzionamento   della nostra associazione. È il
              documento fondamentale che regola le nostre attività e   la
              partecipazione dei soci.  {" "}
            </p>
             {" "}
            <a
              href={currentDownloadLink}
              target="_blank"
              rel="noopener noreferrer"
              className="statuto-download-btn"
            >
                📄 Scarica lo Statuto  {" "}
            </a>
             {" "}
          </div>
           {" "}
        </div>
         {" "}
      </div>
        {renderEditModal()} {" "}
    </div>
  );
};

export default Statuto;
