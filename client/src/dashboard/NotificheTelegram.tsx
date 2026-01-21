import React, { useState, useEffect } from "react";
import {
  FaTelegram,
  FaPlus,
  FaTrash,
  FaListUl,
  FaUsers,
  FaUserPlus,
} from "react-icons/fa";
import "../style/notificheTelegram.css";
// Importiamo anche lo stile dei turni per avere la stessa grafica della modale
import "../style/turni.css";

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
  username: string; // Aggiunto username per la ricerca come nei turni
}

const NotificheTelegram: React.FC = () => {
  const [classiUniche, setClassiUniche] = useState<string[]>([]);
  const [iscritti, setIscritti] = useState<Notifica[]>([]);
  const [tuttiUtenti, setTuttiUtenti] = useState<Utente[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuovaNotifica, setNuovaNotifica] = useState("");
  const [selectedClasse, setSelectedClasse] = useState<string | null>(null);
  const [status, setStatus] = useState({ text: "", isError: false });

  // Stati per la Modale (stile Turni)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<number | null>(
    null,
  );

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
        if (action === "add_notifica") {
          setNuovaNotifica("");
          closeModal(); // Chiudi modale dopo aggiunta
        }
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

  // --- LOGICA MODALE ---
  const openModal = () => {
    setUserSearchTerm("");
    setSelectedUserIdToAdd(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setUserSearchTerm("");
    setSelectedUserIdToAdd(null);
  };

  // Filtra utenti non ancora iscritti alla classe corrente
  const utentiDisponibili = tuttiUtenti.filter(
    (u) => !utentiInClasse.some((i) => i.user_id === u.id),
  );

  // Filtra ulteriormente in base alla ricerca nella modale
  const filteredUsersForModal = utentiDisponibili.filter(
    (user) =>
      `${user.name} ${user.surname}`
        .toLowerCase()
        .includes(userSearchTerm.toLowerCase()) ||
      (user.username &&
        user.username.toLowerCase().includes(userSearchTerm.toLowerCase())),
  );

  // Auto-selezione nella modale se c'è un solo risultato
  useEffect(() => {
    if (
      isModalOpen &&
      filteredUsersForModal.length === 1 &&
      userSearchTerm !== "" &&
      !selectedUserIdToAdd
    ) {
      setSelectedUserIdToAdd(filteredUsersForModal[0].id);
    }
  }, [filteredUsersForModal, userSearchTerm, selectedUserIdToAdd, isModalOpen]);

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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px",
                }}
              >
                <h3>
                  <FaUsers size={14} /> Iscritti a: {selectedClasse}
                </h3>
                {/* Pulsante per aprire la modale stile Turni */}
                <button
                  className="nt-add-button"
                  onClick={openModal}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "8px 15px",
                  }}
                >
                  <FaUserPlus /> Aggiungi Iscritto
                </button>
              </div>

              <div className="nt-user-management">
                {/* Rimossa la vecchia select row, ora c'è il bottone sopra */}

                <div className="nt-members-grid">
                  {utentiInClasse.length === 0 && (
                    <p>Nessun iscritto in questa classe.</p>
                  )}
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
                          title="Rimuovi utente"
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

      {/* --- MODALE STILE TURNI --- */}
      {isModalOpen && selectedClasse && (
        <div className="turno-modal-overlay" onClick={closeModal}>
          <div
            className="turno-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="turno-modal-header">
              <h3>Aggiungi a: {selectedClasse}</h3>
              <button onClick={closeModal} className="close-button">
                ✕
              </button>
            </div>

            <div className="turno-modal-body">
              <div className="form-group">
                <label htmlFor="user-select">Cerca e Seleziona Utente:</label>
                <input
                  type="text"
                  placeholder="Cerca per nome..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="user-search-input"
                  autoFocus
                />
                <select
                  id="user-select"
                  value={selectedUserIdToAdd || ""}
                  onChange={(e) =>
                    setSelectedUserIdToAdd(Number(e.target.value))
                  }
                  size={5} // Mostra 5 righe come nei turni
                  style={{ width: "100%", marginTop: "10px", padding: "8px" }}
                >
                  <option value="" disabled>
                    {filteredUsersForModal.length === 0
                      ? "Nessun utente trovato"
                      : "Seleziona un utente..."}
                  </option>
                  {filteredUsersForModal.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.surname}{" "}
                      {user.username ? `(${user.username})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note rimosse come richiesto */}
            </div>

            <div className="turno-modal-actions">
              <button onClick={closeModal} className="cancel-button">
                Annulla
              </button>
              <button
                onClick={() => {
                  if (selectedUserIdToAdd) {
                    handleAction(
                      "add_notifica",
                      selectedClasse,
                      selectedUserIdToAdd,
                    );
                  }
                }}
                className="assign-button"
                disabled={!selectedUserIdToAdd}
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificheTelegram;
