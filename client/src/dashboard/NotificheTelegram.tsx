import React, { useState, useEffect } from "react";
import { FaTelegram, FaPlus, FaTrash, FaListUl, FaUsers } from "react-icons/fa";
import "../style/notificheTelegram.css";

interface Notifica {
  id: number;
  user_id: number;
  tipo_notifica: string;
  name?: string;
  surname?: string;
}

interface Utente {
  id: number;
  name: string;
  surname: string;
}

const NotificheTelegram: React.FC = () => {
  const [classiUniche, setClassiUniche] = useState<string[]>([]);
  const [iscritti, setIscritti] = useState<Notifica[]>([]);
  const [tuttiUtenti, setTuttiUtenti] = useState<Utente[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuovaNotifica, setNuovaNotifica] = useState("");
  const [selectedClasse, setSelectedClasse] = useState<string | null>(null);
  const [status, setStatus] = useState({ text: "", isError: false });

  const getAuthToken = () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return "";
    const user = JSON.parse(userStr);
    return btoa(
      JSON.stringify({
        userId: user.id,
        tel: user.tel,
        timestamp: Date.now().toString(),
      }),
    );
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      const resNotifiche = await fetch("/api/notifiche-telegram", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataNotifiche = await resNotifiche.json();

      if (dataNotifiche.notifiche_attive) {
        const notifiche = dataNotifiche.notifiche_attive as Notifica[];
        setIscritti(notifiche);
        const unique = Array.from(
          new Set(notifiche.map((n) => n.tipo_notifica)),
        );
        setClassiUniche(unique);
      }

      const resUsers = await fetch("/api/user");
      const dataUsers = await resUsers.json();
      if (dataUsers.success) setTuttiUtenti(dataUsers.users);
    } catch (err) {
      console.error("Errore fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (
    action: string,
    tipo: string,
    targetUserId?: number,
  ) => {
    if (!tipo.trim()) return;

    try {
      const token = getAuthToken();
      const res = await fetch("/api/notifiche-telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          tipo_notifica: tipo.toLowerCase().trim(),
          userIdOverride: targetUserId,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setStatus({ text: result.message, isError: false });
        if (action === "add_notifica") setNuovaNotifica("");
        fetchData();
      }
    } catch (err) {
      setStatus({ text: "Errore operazione", isError: true });
    }
    setTimeout(() => setStatus({ text: "", isError: false }), 3000);
  };

  const utentiInClasse = iscritti.filter(
    (n) => n.tipo_notifica === selectedClasse,
  );

  return (
    <div className="nt-container">
      <div className="nt-header">
        <FaTelegram size={35} color="#0088cc" />
        <h2>Gestione Classi e Iscritti</h2>
      </div>

      {status.text && (
        <div
          className={`nt-status-banner ${status.isError ? "error" : "success"}`}
        >
          {status.text}
        </div>
      )}

      <div className="nt-main-layout">
        <div className="nt-section">
          <h3>
            <FaPlus size={14} /> Crea Nuova Classe
          </h3>
          <div className="nt-input-group">
            <input
              type="text"
              className="nt-input"
              placeholder="Nome classe..."
              value={nuovaNotifica}
              onChange={(e) => setNuovaNotifica(e.target.value)}
            />
            <button
              className="nt-add-button"
              onClick={() => handleAction("add_notifica", nuovaNotifica)}
              disabled={!nuovaNotifica.trim()}
            >
              Crea
            </button>
          </div>

          <div className="nt-class-list">
            <h3>
              <FaListUl size={14} /> Classi Esistenti
            </h3>
            {loading ? (
              <p>Caricamento...</p>
            ) : (
              classiUniche.map((classe) => (
                <div
                  key={classe}
                  className={`nt-class-item ${selectedClasse === classe ? "active" : ""}`}
                  onClick={() => setSelectedClasse(classe)}
                >
                  <span>{classe}</span>
                  <FaUsers size={16} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="nt-section">
          {selectedClasse ? (
            <>
              <h3>
                <FaUsers size={14} /> Iscritti a: {selectedClasse}
              </h3>
              <div className="nt-user-management">
                <div className="nt-add-user-row">
                  <select
                    className="nt-input"
                    onChange={(e) =>
                      handleAction(
                        "add_notifica",
                        selectedClasse,
                        parseInt(e.target.value),
                      )
                    }
                    value=""
                  >
                    <option value="" disabled>
                      Aggiungi un utente...
                    </option>
                    {tuttiUtenti
                      .filter(
                        (u) => !utentiInClasse.some((i) => i.user_id === u.id),
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.surname}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="nt-members-grid">
                  {utentiInClasse.map((m) => {
                    const info = tuttiUtenti.find((u) => u.id === m.user_id);
                    return (
                      <div key={m.user_id} className="nt-member-card">
                        <span>
                          {info
                            ? `${info.name} ${info.surname}`
                            : `User ID: ${m.user_id}`}
                        </span>
                        <button
                          className="nt-remove-btn"
                          onClick={() =>
                            handleAction(
                              "remove_notifica",
                              selectedClasse,
                              m.user_id,
                            )
                          }
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="nt-placeholder">
              {loading
                ? "Caricamento in corso..."
                : "Seleziona una classe a sinistra per gestire gli utenti"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificheTelegram;
