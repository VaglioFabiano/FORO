import React, { useState, useEffect } from "react";
import { Edit } from "lucide-react";
import "../style/header.css";

// --- LOGICA CACHE (Invariata) ---
const CACHE_VERSION_KEY = "cachedHomepageVersion";
const CACHE_HEADER_KEY = "cachedHeaderData";
const CACHE_DATA_KEY = "cachedHomepageData";
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

const Header: React.FC = () => {
  const [descrizione, setDescrizione] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [tempDescrizione, setTempDescrizione] = useState("");
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const defaultDescription =
    "Siamo uno spazio gestito da volontari, dedicato allo studio silenzioso e allo studio ad alta voce: un ambiente accogliente dove ognuno può concentrarsi o confrontarsi nel rispetto reciproco.";

  useEffect(() => {
    loadDescrizione();
    checkUserLevel();
  }, []);

  const checkUserLevel = () => {
    try {
      const user = localStorage.getItem("user");
      if (user) {
        const userData = JSON.parse(user);
        setUserLevel(userData.level);
      }
    } catch (error) {
      console.error("Errore nel parsing user data:", error);
      setUserLevel(null);
    }
  };

  const loadDescrizione = async () => {
    setIsLoading(true);
    const cookieConsent = localStorage.getItem("cookieConsent");
    const localVersion = getCachedVersion();
    const cachedData = getCachedData(CACHE_HEADER_KEY);

    if (cookieConsent === "accepted" && localVersion && cachedData) {
      setDescrizione(cachedData);
      setTempDescrizione(cachedData);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/homepage?section=header");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.success && data.descrizione) {
        setDescrizione(data.descrizione);
        setTempDescrizione(data.descrizione);
        setCachedData(CACHE_HEADER_KEY, data.descrizione);
        setCachedVersion(data.version);
      } else {
        setDescrizione(defaultDescription);
        setTempDescrizione(defaultDescription);
      }
    } catch (error) {
      console.error("Errore header:", error);
      setDescrizione(defaultDescription);
      setTempDescrizione(defaultDescription);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setTempDescrizione(descrizione);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setTempDescrizione(descrizione);
  };

  const handleSaveClick = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      const user = localStorage.getItem("user");
      if (!user) {
        alert("Login necessario");
        return;
      }
      const userData = JSON.parse(user);

      const requestBody = {
        type: "header",
        data: { descrizione: tempDescrizione.trim() },
        user_id: userData.id === 0 ? 1 : userData.id,
      };

      const response = await fetch("/api/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error("Errore salvataggio");
      const data = await response.json();

      if (data.success) {
        setDescrizione(tempDescrizione.trim());
        setIsEditing(false);
        invalidateHomepageCache();
      } else {
        throw new Error(data.error || "Errore");
      }
    } catch (error) {
      alert("Errore durante il salvataggio.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ): void => {
    const target = e.target as HTMLImageElement;
    const nextSibling = target.nextElementSibling as HTMLElement;
    target.style.display = "none";
    if (nextSibling) nextSibling.style.display = "flex";
  };

  const canEdit =
    userLevel !== null &&
    (userLevel === 0 || userLevel === 1 || userLevel === 2);

  return (
    <header id="header_foro" className="header_foro_wrapper">
      <div className="header_foro_background"></div>
      <div className="header_foro_overlay"></div>

      <div className="header_foro_content">
        <div className="header_foro_logo_container">
          <img
            src="/assets/logo.png"
            alt="Logo Aula Studio"
            className="header_foro_logo_image"
            onError={handleImageError}
          />
          <div className="header_foro_logo_fallback">
            <span className="header_foro_logo_text">AS</span>
          </div>
        </div>

        <div className="header_foro_title_section">
          <h1 className="header_foro_main_title">Associazione FORO</h1>

          {isLoading ? (
            <div className="header_foro_loading_container">
              <div className="header_foro_loading_dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          ) : isEditing ? (
            <div className="header_foro_edit_container">
              <textarea
                value={tempDescrizione}
                onChange={(e) => setTempDescrizione(e.target.value)}
                className="header_foro_textarea"
                placeholder="Inserisci la descrizione..."
                disabled={isSaving}
              />
              <div className="header_foro_buttons_row">
                <button
                  onClick={handleSaveClick}
                  className="header_foro_btn header_foro_btn_save"
                  disabled={isSaving || tempDescrizione.trim() === ""}
                >
                  {isSaving ? "Salvando..." : "Salva"}
                </button>
                <button
                  onClick={handleCancelClick}
                  className="header_foro_btn header_foro_btn_cancel"
                  disabled={isSaving}
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <div className="header_foro_desc_container">
              <p className="header_foro_description">{descrizione}</p>
              {canEdit && (
                <button
                  onClick={handleEditClick}
                  className="header_foro_btn header_foro_btn_edit"
                >
                  <Edit size={16} /> Modifica
                </button>
              )}
            </div>
          )}
        </div>

        <div className="header_foro_scroll_hint">
          <div className="header_foro_scroll_arrow"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
