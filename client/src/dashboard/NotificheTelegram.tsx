import React, { useState, useEffect } from "react";
import { FaTelegram, FaPlus, FaTrash, FaBell, FaListUl } from "react-icons/fa";
import "../style/notificheTelegram.css";

interface Notifica {
  id: number;
  tipo_notifica: string;
}

const NotificheTelegram: React.FC = () => {
  const [notifiche, setNotifiche] = useState<Notifica[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuovaNotifica, setNuovaNotifica] = useState("");
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

  const fetchNotifiche = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch("/api/notifiche-telegram", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.notifiche_attive) setNotifiche(data.notifiche_attive);
    } catch (err) {
      console.error("Errore fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifiche();
  }, []);

  const handleAction = async (
    action: "add_notifica" | "remove_notifica",
    tipo: string,
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
        }),
      });

      const result = await res.json();
      if (result.success) {
        setStatus({ text: result.message, isError: false });
        setNuovaNotifica("");
        fetchNotifiche();
      } else {
        setStatus({ text: result.error || "Errore operazione", isError: true });
      }
    } catch (err) {
      setStatus({ text: "Errore di rete", isError: true });
    }
    setTimeout(() => setStatus({ text: "", isError: false }), 3000);
  };

  return (
    <div className="nt-container">
      <div className="nt-header">
        <FaTelegram size={35} color="#0088cc" />
        <h2>Classi di Notifica Telegram</h2>
      </div>

      {status.text && (
        <div
          className={`nt-status-banner ${status.isError ? "error" : "success"}`}
        >
          {status.text}
        </div>
      )}

      <div className="nt-input-section">
        <input
          type="text"
          className="nt-input"
          placeholder="Inserisci nome classe (es. turni, avvisi...)"
          value={nuovaNotifica}
          onChange={(e) => setNuovaNotifica(e.target.value)}
          onKeyPress={(e) =>
            e.key === "Enter" && handleAction("add_notifica", nuovaNotifica)
          }
        />
        <button
          className="nt-add-button"
          onClick={() => handleAction("add_notifica", nuovaNotifica)}
          disabled={!nuovaNotifica.trim()}
        >
          <FaPlus /> Crea Classe
        </button>
      </div>

      <div className="nt-list-section">
        <h3>
          <FaListUl size={14} /> Classi configurate per il tuo profilo
        </h3>

        {loading ? (
          <div className="nt-empty-state">Caricamento in corso...</div>
        ) : notifiche.length === 0 ? (
          <div className="nt-empty-state">
            Nessuna classe attiva. Creane una sopra.
          </div>
        ) : (
          <div className="nt-grid">
            {notifiche.map((n) => (
              <div key={n.id} className="nt-card">
                <div className="nt-info">
                  <FaBell className="nt-bell" />
                  <span className="nt-type-label">{n.tipo_notifica}</span>
                </div>
                <button
                  className="nt-delete-btn"
                  onClick={() =>
                    handleAction("remove_notifica", n.tipo_notifica)
                  }
                  title="Elimina classe"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificheTelegram;
