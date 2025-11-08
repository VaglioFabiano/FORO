import React, { useEffect, useState, useRef } from "react";
import { ExternalLink, MessageCircle, RefreshCw, Edit } from "lucide-react";
import "../style/social.css";

// --- LOGICA CACHE BASATA SU VERSIONE ---
const CACHE_VERSION_KEY = "cachedHomepageVersion";
const CACHE_DATA_KEY = "cachedHomepageData";
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

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

interface SocialData {
  post_instagram: string;
  post_facebook: string;
  canale_telegram: string;
}

interface User {
  id: number;
  level: number;
}

const SocialSection: React.FC = () => {
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [socialData, setSocialData] = useState<SocialData>({
    post_instagram: "",
    post_facebook: "",
    canale_telegram: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<SocialData>({
    post_instagram: "",
    post_facebook: "",
    canale_telegram: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const instagramCardRef = useRef<HTMLDivElement>(null);
  const facebookIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadSocialData();
    checkUserPermissions();
    loadSocialScripts();
  }, []);

  useEffect(() => {
    if (socialData.post_instagram) {
      const timer = setTimeout(() => {
        if (window.instgrm) {
          window.instgrm.Embeds.process();
          setEmbedLoaded(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [socialData.post_instagram]);

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

  const processSocialData = (social: any) => {
    const defaultData = {
      post_instagram: social?.post_instagram || "",
      post_facebook: social?.post_facebook || "",
      canale_telegram: social?.canale_telegram || "",
    };
    setSocialData(defaultData);
    setEditData(defaultData);
  };

  const loadSocialData = async () => {
    setIsLoading(true);

    const cookieConsent = localStorage.getItem("cookieConsent");
    const localVersion = getCachedVersion();
    const cachedData = getCachedData(CACHE_DATA_KEY);

    if (
      cookieConsent === "accepted" &&
      localVersion &&
      cachedData &&
      cachedData.social
    ) {
      console.log("Loading Social from cache");
      processSocialData(cachedData.social);
      setIsLoading(false);
      return;
    }

    try {
      console.log("Fetching fresh data for Homepage (Social)");
      const response = await fetch("/api/homepage");
      const data = await response.json();

      if (data.success) {
        processSocialData(data.social);
        setCachedData(CACHE_DATA_KEY, data);
        setCachedData(CACHE_HEADER_KEY, data.header?.descrizione);
        setCachedData(CACHE_SEGNALAZIONI_KEY, data.segnalazioni);
        setCachedVersion(data.header?.version);
      } else {
        processSocialData(null);
      }
    } catch (error) {
      console.error("Errore nel caricamento dati social:", error);
      processSocialData(null);
      setMessage({
        type: "error",
        text: "Errore nel caricamento dei dati social",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSocialScripts = () => {
    if (!document.querySelector("#instagram-embed-script")) {
      const script = document.createElement("script");
      script.id = "instagram-embed-script";
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        if (window.instgrm) {
          window.instgrm.Embeds.process();
          setEmbedLoaded(true);
        }
      };
    }
  };

  const handleSocialClick = (url: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(socialData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(socialData);
  };

  const handleSave = async () => {
    if (!currentUser) {
      setMessage({
        type: "error",
        text: "Devi essere loggato per modificare i social",
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
          type: "social",
          data: editData,
          user_id: currentUser.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSocialData(editData);
        setIsEditing(false);
        setMessage({
          type: "success",
          text: "Link social aggiornati con successo!",
        });

        invalidateHomepageCache();

        setTimeout(() => {
          if (window.instgrm) {
            window.instgrm.Embeds.process();
          }
        }, 500);
      } else {
        throw new Error(data.error || "Errore nel salvataggio");
      }
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      setMessage({
        type: "error",
        text: "Errore durante il salvataggio dei link social",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit =
    currentUser &&
    (currentUser.level === 0 ||
      currentUser.level === 1 ||
      currentUser.level === 2);

  const renderInstagramContent = () => {
    const postUrl = socialData.post_instagram;
    if (!postUrl) {
      return (
        <div className="foro-loading-superstate">
          <p>Nessun post Instagram configurato</p>
        </div>
      );
    }

    return (
      <div className="foro-posts-megacontainer">
        <div className="posts-grid">
          <div className="foro-instagram-ultrawrapper">
            <blockquote
              className="instagram-media"
              data-instgrm-captioned
              data-instgrm-permalink={postUrl}
              data-instgrm-version="14"
              style={{
                width: "100%",
                maxWidth: "100%",
                margin: 0,
                padding: 0,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "16px" }}>
                <a href={postUrl} target="_blank" rel="noopener noreferrer">
                  Visualizza questo post su Instagram
                </a>
              </div>
            </blockquote>
            {!embedLoaded && (
              <div className="foro-loading-superstate">
                <RefreshCw className="foro-loading-megaspinner" size={24} />
                <p>Caricamento post Instagram...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFacebookContent = () => {
    const postUrl = socialData.post_facebook;
    if (!postUrl) {
      return (
        <div className="foro-loading-superstate">
          <p>Nessun post Facebook configurato</p>
        </div>
      );
    }

    return (
      <div className="foro-facebook-ultracontainer">
        <iframe
          ref={facebookIframeRef}
          src={postUrl}
          width="100%"
          height="100%"
          style={{
            border: "none",
            overflow: "hidden",
            margin: 0,
            padding: 0,
            position: "absolute",
            top: "50%",
            left: 0,
            width: "100%",
            height: "150%",
            transform: "translateY(-50%)",
          }}
          scrolling="no"
          frameBorder="0"
          allowFullScreen={true}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          title="Post Facebook"
          onLoad={() => setEmbedLoaded(true)}
        />
        {!embedLoaded && (
          <div className="foro-loading-superstate">
            <RefreshCw className="foro-loading-megaspinner" size={24} />
            <p>Caricamento post Facebook...</p>
          </div>
        )}
      </div>
    );
  };

  const renderEditModal = () => {
    if (!isEditing) return null;

    return (
      <div className="foro-edit-megaoverlay" onClick={handleCancel}>
        <div
          className="foro-edit-ultramodal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="foro-modal-supertop">
            <h3>Modifica Link Social</h3>
            <button className="foro-close-megabutton" onClick={handleCancel}>
              ×
            </button>
          </div>

          <div className="foro-modal-ultrabody">
            <div className="foro-form-supergroup">
              <label htmlFor="instagram-post">Link Post Instagram</label>
              <input
                id="instagram-post"
                type="url"
                value={editData.post_instagram}
                onChange={(e) =>
                  setEditData({ ...editData, post_instagram: e.target.value })
                }
                placeholder="https://www.instagram.com/reel/..."
                disabled={isSaving}
              />
              <small>
                Inserisci il link del post o reel Instagram da mostrare
              </small>
            </div>

            <div className="foro-form-supergroup">
              <label htmlFor="facebook-post">Link Post Facebook (Embed)</label>
              <input
                id="facebook-post"
                type="url"
                value={editData.post_facebook}
                onChange={(e) =>
                  setEditData({ ...editData, post_facebook: e.target.value })
                }
                placeholder="https://www.facebook.com/plugins/post.php?href=..."
                disabled={isSaving}
              />
              <small>Inserisci il link embed del post Facebook</small>
            </div>

            <div className="foro-form-supergroup">
              <label htmlFor="telegram-channel">Link Canale Telegram</label>
              <input
                id="telegram-channel"
                type="url"
                value={editData.canale_telegram}
                onChange={(e) =>
                  setEditData({ ...editData, canale_telegram: e.target.value })
                }
                placeholder="https://t.me/nomecanale"
                disabled={isSaving}
              />
              <small>Inserisci il link del canale Telegram</small>
            </div>
          </div>

          <div className="foro-modal-megaactions">
            <button
              className="foro-cancel-ultrabutton"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Annulla
            </button>
            <button
              className="foro-save-megabutton"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salva"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <section className="foro-social-megasection">
        <div className="foro-loading-superstate">
          <RefreshCw className="foro-loading-megaspinner" size={24} />
          <p>Caricamento sezione social...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="foro-social-megasection">
      <div className="foro-social-masthead">
        <h2 className="foro-social-supertitle">Seguici sui social</h2>
        {canEdit && (
          <button className="foro-edit-social-superbutton" onClick={handleEdit}>
            <Edit size={16} /> Modifica Link
          </button>
        )}
      </div>

      {message && (
        <div className={`foro-social-flashmessage ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      <div className="foro-social-ultragrid">
        {/* Instagram Card */}
        <div
          ref={instagramCardRef}
          className="foro-social-megacard instagram-card"
          onClick={(e) => {
            const profileUrl = socialData.post_instagram
              ? socialData.post_instagram.replace(/\/p\/.*|\/reel\/.*/, "")
              : "https://www.instagram.com/associazioneforo/";
            handleSocialClick(profileUrl, e);
          }}
          role="button"
          tabIndex={0}
          aria-label="Visita il profilo Instagram"
        >
          <div className="foro-social-cardtop">
            <div className="foro-social-platformdata">
              <div className="foro-instagram-supericon">📸</div>
              <div>
                <h3 className="foro-platform-megatitle">Instagram</h3>
                <p className="foro-platform-megausername">@associazioneforo</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const profileUrl = socialData.post_instagram
                  ? socialData.post_instagram.replace(/\/p\/.*|\/reel\/.*/, "")
                  : "https://www.instagram.com/associazioneforo/";
                handleSocialClick(profileUrl, e);
              }}
              className="foro-external-ultralink"
              aria-label="Apri Instagram in una nuova scheda"
            >
              <ExternalLink size={16} />
            </button>
          </div>
          <div className="foro-social-cardcontent">
            {renderInstagramContent()}
          </div>
        </div>

        {/* Facebook Card */}
        <div
          className="foro-social-megacard facebook-card"
          onClick={(e) =>
            handleSocialClick(
              "https://www.facebook.com/associazioneforopiossasco",
              e
            )
          }
          role="button"
          tabIndex={0}
          aria-label="Visita la pagina Facebook"
        >
          <div className="foro-social-cardtop">
            <div className="foro-social-platformdata">
              <div className="foro-facebook-supericon">👥</div>
              <div>
                <h3 className="foro-platform-megatitle">Facebook</h3>
                <p className="foro-platform-megausername">Associazione Foro</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSocialClick(
                  "https://www.facebook.com/associazioneforopiossasco",
                  e
                );
              }}
              className="foro-external-ultralink"
              aria-label="Apri Facebook in una nuova scheda"
            >
              <ExternalLink size={16} />
            </button>
          </div>
          <div className="foro-social-cardcontent facebook-content">
            {renderFacebookContent()}
          </div>
        </div>
      </div>

      {/* Telegram Bar */}
      <div className="foro-telegram-megacontainer">
        <div
          className="foro-telegram-ultrabar"
          onClick={(e) => handleSocialClick(socialData.canale_telegram, e)}
          role="button"
          tabIndex={0}
          aria-label="Unisciti al canale Telegram"
        >
          <div className="foro-telegram-supercontent">
            <div className="foro-telegram-megainfo">
              <div className="foro-telegram-supericon">
                <MessageCircle size={20} />
              </div>
              <div className="foro-telegram-megatext">
                <h3 className="foro-telegram-supertitle">Telegram</h3>
                <p className="foro-telegram-megausername">@aulastudioforo</p>
                <span className="foro-telegram-ultradescription">
                  Canale ufficiale per comunicazioni
                </span>
              </div>
            </div>
            <div className="foro-telegram-megastatus">
              <div className="foro-status-superbadge">
                <div className="foro-status-ultraindicator"></div>
                <span>Attivo</span>
              </div>
              <ExternalLink size={16} className="foro-telegram-superarrow" />
            </div>
          </div>
        </div>
      </div>

      {renderEditModal()}
    </section>
  );
};

export default SocialSection;
