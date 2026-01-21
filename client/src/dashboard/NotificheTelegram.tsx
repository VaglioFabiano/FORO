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
import "../style/turni.css"; // Importiamo stile turni per la modale

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
  username: string;
}

const NotificheTelegram: React.FC = () => {
  const [classiUniche, setClassiUniche] = useState<string[]>([]);
  const [iscritti, setIscritti] = useState<Notifica[]>([]);
  const [tuttiUtenti, setTuttiUtenti] = useState<Utente[]>([]);
  const [loading, setLoading] = useState(true);

  // Input per il nome della nuova classe
  const [nuovaNotifica, setNuovaNotifica] = useState("");

  // Classe attualmente selezionata (o quella che stiamo creando)
  const [selectedClasse, setSelectedClasse] = useState<string | null>(null);

  const [status, setStatus] = useState({ text: "", isError: false });

  // Stati Modale
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<number | null>(
    null,
  );

  // Flag per capire se stiamo creando una classe nuova o aggiungendo a una esistente
  const [isCreatingNew, setIsCreatingNew] = useState(false);

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
          userIdOverride: targetUserId, // Qui passiamo l'ID scelto, mai quello di default
        }),
      });

      const result = await res.json();
      if (result.success) {
        setStatus({ text: result.message, isError: false });

        // Se abbiamo creato una nuova classe, puliamo l'input
        if (isCreatingNew) {
          setNuovaNotifica("");
          setIsCreatingNew(false);
        }

        closeModal();
        fetchData();
      }
    } catch (err) {
      setStatus({ text: "Errore operazione", isError: true });
    }
    setTimeout(() => setStatus({ text: "", isError: false }), 3000);
  };

  // Handler per il bottone "Crea" (Nuova Classe)
  const handleStartCreateClass = () => {
    if (!nuovaNotifica.trim()) return;

    // Impostiamo la nuova classe come selezionata temporaneamente
    setSelectedClasse(nuovaNotifica.trim());
    setIsCreatingNew(true); // Modalità creazione
    openModal(); // Apriamo subito la modale per scegliere il primo utente
  };

  // Handler per il bottone "Aggiungi Iscritto" (Classe Esistente)
  const handleStartAddUser = () => {
    if (!selectedClasse) return;
    setIsCreatingNew(false); // Modalità aggiunta
    openModal();
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
    // Se stavamo creando una classe ma abbiamo annullato, resettiamo la selezione
    if (isCreatingNew) {
      // Opzionale: se si vuole tornare alla selezione precedente o a null
      // setSelectedClasse(null);
      setIsCreatingNew(false);
    }
  };

  // Utenti disponibili:
  // Se stiamo creando una classe nuova (che non esiste ancora nei dati), tutti sono disponibili.
  // Se è una classe esistente, filtriamo chi è già dentro.
  const utentiDisponibili = isCreatingNew
    ? tuttiUtenti
    : tuttiUtenti.filter(
        (u) => !utentiInClasse.some((i) => i.user_id === u.id),
      );

  const filteredUsersForModal = utentiDisponibili.filter(
    (user) =>
      `${user.name} ${user.surname}`
        .toLowerCase()
        .includes(userSearchTerm.toLowerCase()) ||
      (user.username &&
        user.username.toLowerCase().includes(userSearchTerm.toLowerCase())),
  );

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
            {/* Il bottone ora apre la modale, non chiama API diretta */}
            <button
              className="nt-add-button"
              onClick={handleStartCreateClass}
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
                  className={`nt-class-item ${selectedClasse === classe && !isCreatingNew ? "active" : ""}`}
                  onClick={() => {
                    setSelectedClasse(classe);
                    setIsCreatingNew(false);
                    setNuovaNotifica(""); // Pulisce input nuova classe se cambi selezione
                  }}
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
                  <FaUsers size={14} />
                  {isCreatingNew
                    ? `Nuova Classe: ${selectedClasse}`
                    : `Iscritti a: ${selectedClasse}`}
                </h3>

                {/* Mostra il pulsante aggiungi solo se la classe esiste già (non in creazione) */}
                {!isCreatingNew && (
                  <button
                    className="nt-add-button"
                    onClick={handleStartAddUser}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "8px 15px",
                    }}
                  >
                    <FaUserPlus /> Aggiungi Iscritto
                  </button>
                )}
              </div>

              <div className="nt-user-management">
                <div className="nt-members-grid">
                  {utentiInClasse.length === 0 && !isCreatingNew && (
                    <p>Nessun iscritto in questa classe.</p>
                  )}
                  {isCreatingNew && (
                    <p>
                      Seleziona il primo utente dalla finestra per creare la
                      classe.
                    </p>
                  )}

                  {/* Lista utenti esistenti */}
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

      {/* --- MODALE UNIFICATA (Creazione o Aggiunta) --- */}
      {isModalOpen && selectedClasse && (
        <div className="turno-modal-overlay" onClick={closeModal}>
          <div
            className="turno-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="turno-modal-header">
              <h3>
                {isCreatingNew
                  ? "Crea Classe e Aggiungi Primo Utente"
                  : `Aggiungi a: ${selectedClasse}`}
              </h3>
              <button onClick={closeModal} className="close-button">
                ✕
              </button>
            </div>

            <div className="turno-modal-body">
              {isCreatingNew && (
                <p
                  style={{
                    marginBottom: "15px",
                    fontSize: "0.9em",
                    color: "#666",
                  }}
                >
                  Stai creando la classe <strong>"{selectedClasse}"</strong>. È
                  obbligatorio selezionare almeno un utente iniziale.
                </p>
              )}

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
                  size={5}
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
                {isCreatingNew ? "Crea e Aggiungi" : "Aggiungi Utente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificheTelegram;
