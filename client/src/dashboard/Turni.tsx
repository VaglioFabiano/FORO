import React, { useState, useEffect } from "react";
import "../style/turni.css";

interface Turno {
  id: number | null;
  data: string;
  turno_inizio: string;
  turno_fine: string;
  fascia_id: number | null;
  user_id: number | null;
  note: string;
  user_name: string;
  user_surname: string;
  user_username: string;
  assigned: boolean;
  day_index: number;
  turno_index: number;
  nota_automatica?: string;
  is_default?: boolean;
  is_closed_override?: boolean | number;
  is_placeholder?: boolean;
}

interface User {
  id: number;
  name: string;
  surname: string;
  username: string;
  level: number;
}

interface Message {
  type: "success" | "error" | "info";
  text: string;
}

type WeekType = "corrente" | "prossima" | "plus2" | "plus3";

const Turni: React.FC = () => {
  // --- Stati Dati ---
  const [turniCorrente, setTurniCorrente] = useState<Turno[]>([]);
  const [turniProssima, setTurniProssima] = useState<Turno[]>([]);
  const [turniPlus2, setTurniPlus2] = useState<Turno[]>([]);
  const [turniPlus3, setTurniPlus3] = useState<Turno[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // --- Stati UI ---
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<WeekType>("corrente");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null); // NUOVO STATO ERRORE MODALE

  // --- Stati Form Modale ---
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClosedOverride, setIsClosedOverride] = useState(false);

  // --- Stati per Turni Spezzati ---
  const [isPartialTurno, setIsPartialTurno] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");

  const [userSearchTerm, setUserSearchTerm] = useState("");

  const giorni = [
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
    "Domenica",
  ];

  const standardSlots = [
    {
      index: 0,
      label: "09:00 - 13:00",
      defaultStart: "09:00",
      defaultEnd: "13:00",
    },
    {
      index: 1,
      label: "13:00 - 16:00",
      defaultStart: "13:00",
      defaultEnd: "16:00",
    },
    {
      index: 2,
      label: "16:00 - 19:30",
      defaultStart: "16:00",
      defaultEnd: "19:30",
    },
    {
      index: 3,
      label: "21:00 - 24:00",
      defaultStart: "21:00",
      defaultEnd: "24:00",
    },
  ];

  useEffect(() => {
    fetchAllTurni();
    fetchUsers();
    getCurrentUser();
  }, []);

  const getCurrentUser = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (error) {
        console.error("Errore parsing user data:", error);
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/user");
      const data = await response.json();
      if (data.success) setUsers(data.users);
    } catch (error) {
      console.error("Errore caricamento utenti:", error);
    }
  };

  const fetchAllTurni = async () => {
    setLoading(true);
    try {
      const settimane: WeekType[] = ["corrente", "prossima", "plus2", "plus3"];
      const promises = settimane.map((settimana) =>
        fetch(`/api/turni?settimana=${settimana}`)
          .then((res) => res.json())
          .then((data) => ({ settimana, data })),
      );

      const results = await Promise.all(promises);

      results.forEach(({ settimana, data }) => {
        if (data.success) {
          switch (settimana) {
            case "corrente":
              setTurniCorrente(data.turni);
              break;
            case "prossima":
              setTurniProssima(data.turni);
              break;
            case "plus2":
              setTurniPlus2(data.turni);
              break;
            case "plus3":
              setTurniPlus3(data.turni);
              break;
          }
        }
      });
    } catch (error) {
      console.error("Errore caricamento turni:", error);
      setMessage({ type: "error", text: "Errore nel caricamento dei turni" });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTurni = (): Turno[] => {
    switch (selectedWeek) {
      case "prossima":
        return turniProssima;
      case "plus2":
        return turniPlus2;
      case "plus3":
        return turniPlus3;
      default:
        return turniCorrente;
    }
  };

  // --- LOGICA MODALE ---

  const handleTurnoClick = (turno: Turno) => {
    setSelectedTurno(turno);
    setSelectedUserId(turno.user_id || currentUser?.id || null);
    setNote(turno.note || "");
    setUserSearchTerm("");
    setModalError(null); // Reset errore modale

    setCustomStartTime(turno.turno_inizio);
    setCustomEndTime(turno.turno_fine);

    const standardSlot = standardSlots.find(
      (s) => s.index === turno.turno_index,
    );
    if (standardSlot) {
      const isCustomTime =
        turno.turno_inizio !== standardSlot.defaultStart ||
        turno.turno_fine !== standardSlot.defaultEnd;
      setIsPartialTurno(isCustomTime);
    } else {
      setIsPartialTurno(false);
    }

    setIsClosedOverride(!!turno.is_closed_override);
    setIsModalOpen(true);
  };

  const handleAddTurnoClick = (
    dayIndex: number,
    slotIndex: number,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setModalError(null); // Reset errore modale

    const weekOffset =
      selectedWeek === "corrente"
        ? 0
        : selectedWeek === "prossima"
          ? 1
          : selectedWeek === "plus2"
            ? 2
            : 3;
    const now = new Date();
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(
      now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + weekOffset * 7,
    );

    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + dayIndex);

    const standardSlot = standardSlots.find((s) => s.index === slotIndex);

    const newTurno: Turno = {
      id: null,
      data: targetDate.toISOString().split("T")[0],
      turno_inizio: standardSlot?.defaultStart || "00:00",
      turno_fine: standardSlot?.defaultEnd || "00:00",
      fascia_id: null,
      user_id: null,
      note: "",
      user_name: "",
      user_surname: "",
      user_username: "",
      assigned: false,
      day_index: dayIndex,
      turno_index: slotIndex,
      is_placeholder: false,
    };

    setSelectedTurno(newTurno);
    setSelectedUserId(currentUser?.id || null);
    setNote("");
    setUserSearchTerm("");
    setCustomStartTime(newTurno.turno_inizio);
    setCustomEndTime(newTurno.turno_fine);
    setIsPartialTurno(false);
    setIsClosedOverride(false);
    setIsModalOpen(true);
  };

  // Validazione Sovrapposizioni
  const checkOverlap = (
    dayIndex: number,
    newStart: string,
    newEnd: string,
    currentTurnoId: number | null,
  ): boolean => {
    const turniAttuali = getCurrentTurni();

    const shiftsInDay = turniAttuali.filter(
      (t) =>
        t.day_index === dayIndex &&
        t.assigned &&
        !t.is_placeholder &&
        t.id !== currentTurnoId,
    );

    return shiftsInDay.some((existing) => {
      return newStart < existing.turno_fine && newEnd > existing.turno_inizio;
    });
  };

  const handleAssegnaTurno = async () => {
    if (!selectedTurno || !selectedUserId) return;
    setModalError(null); // Pulisci errori precedenti

    const finalStart = isPartialTurno
      ? customStartTime
      : selectedTurno.turno_inizio;
    const finalEnd = isPartialTurno ? customEndTime : selectedTurno.turno_fine;

    // Validazioni Locali (mostrate nel modale)
    if (finalStart >= finalEnd) {
      setModalError("L'orario di inizio deve essere precedente alla fine.");
      return;
    }

    const hasOverlap = checkOverlap(
      selectedTurno.day_index,
      finalStart,
      finalEnd,
      selectedTurno.id,
    );
    if (hasOverlap) {
      setModalError(
        "⚠️ L'orario selezionato si sovrappone a un altro turno già assegnato!",
      );
      return;
    }

    try {
      const response = await fetch("/api/turni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: selectedTurno.data,
          turno_inizio: finalStart,
          turno_fine: finalEnd,
          user_id: selectedUserId,
          note: note,
          is_closed_override: isClosedOverride,
          current_user_id: currentUser?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Successo: Chiudi modale e mostra messaggio globale
        setMessage({ type: "success", text: "Turno salvato con successo!" });
        closeModal();
        fetchAllTurni();
      } else {
        // Errore Server: Mostra nel modale
        setModalError(data.error || "Errore durante il salvataggio.");
      }
    } catch (error) {
      setModalError("Errore di connessione al server.");
    }
  };

  const handleRimuoviTurno = async () => {
    if (!selectedTurno) return;
    try {
      const response = await fetch("/api/turni", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: selectedTurno.data,
          turno_inizio: selectedTurno.turno_inizio,
          turno_fine: selectedTurno.turno_fine,
          current_user_id: currentUser?.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "Turno rimosso!" });
        fetchAllTurni();
        closeModal();
      } else {
        setModalError(data.error || "Errore nella rimozione.");
      }
    } catch (error) {
      setModalError("Errore di connessione.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTurno(null);
    setIsPartialTurno(false);
    setModalError(null);
  };

  const isSlotNaturallyClosed = (dayIndex: number, turnoIndex: number) => {
    if (turnoIndex === 3) return true;
    if (dayIndex === 5 || dayIndex === 6) return true;
    return false;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getWeekRange = (weekOffset: number) => {
    const now = new Date();
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(
      now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + weekOffset * 7,
    );
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.getDate()}-${sunday.getDate()} ${monday.toLocaleDateString("it-IT", { month: "long" })}`;
  };

  const filteredUsers = users.filter(
    (user) =>
      `${user.name} ${user.surname}`
        .toLowerCase()
        .includes(userSearchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(userSearchTerm.toLowerCase()),
  );

  useEffect(() => {
    if (
      filteredUsers.length === 1 &&
      userSearchTerm !== "" &&
      !selectedUserId
    ) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, userSearchTerm, selectedUserId]);

  // --- RENDER GRID ---

  const renderTurniGrid = () => {
    const turniAttuali = getCurrentTurni();
    const weekOffset =
      selectedWeek === "corrente"
        ? 0
        : selectedWeek === "prossima"
          ? 1
          : selectedWeek === "plus2"
            ? 2
            : 3;
    const now = new Date();
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(
      now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + weekOffset * 7,
    );

    return (
      <div className="turni-grid">
        <div className="turni-header">
          <div className="turni-time-column"></div>
          {giorni.map((giorno, index) => {
            const dateForColumn = new Date(monday);
            dateForColumn.setDate(monday.getDate() + index);
            return (
              <div key={index} className="turni-day-header">
                <div className="day-name">{giorno}</div>
                <div className="day-date">
                  {dateForColumn.toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="turni-body">
          {standardSlots.map((slot) => (
            <div key={slot.index} className="turni-row">
              <div className="turni-time-cell">{slot.label}</div>

              {giorni.map((_, dayIndex) => {
                const turniCella = turniAttuali.filter(
                  (t) =>
                    t.day_index === dayIndex && t.turno_index === slot.index,
                );

                const realShifts = turniCella
                  .filter((t) => !t.is_placeholder && t.assigned)
                  .sort((a, b) => a.turno_inizio.localeCompare(b.turno_inizio));

                const placeholder = turniCella.find((t) => t.is_placeholder);
                const isClosed = isSlotNaturallyClosed(dayIndex, slot.index);

                return (
                  <div
                    key={`${dayIndex}-${slot.index}`}
                    className={`turni-cell-container ${isClosed ? "closed-slot" : ""}`}
                  >
                    {realShifts.length > 0 ? (
                      <>
                        {realShifts.map((turno) => (
                          <div
                            key={turno.id}
                            className={`turno-card ${turno.is_closed_override ? "extraordinary" : "standard"}`}
                            onClick={() => handleTurnoClick(turno)}
                          >
                            <div className="turno-card-time">
                              {turno.turno_inizio}-{turno.turno_fine}
                            </div>
                            <div className="turno-card-user">
                              {turno.user_name} {turno.user_surname}
                            </div>
                            {turno.note && (
                              <div
                                className="turno-card-note-text"
                                title={turno.note}
                              >
                                {turno.note}
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          className="add-shift-btn-mini"
                          title="Aggiungi turno extra"
                          onClick={(e) =>
                            handleAddTurnoClick(dayIndex, slot.index, e)
                          }
                        >
                          +
                        </button>
                      </>
                    ) : (
                      <div
                        className="turno-placeholder"
                        onClick={() =>
                          placeholder
                            ? handleTurnoClick(placeholder)
                            : handleAddTurnoClick(
                                dayIndex,
                                slot.index,
                                {} as any,
                              )
                        }
                      >
                        <span className="placeholder-text">
                          {isClosed ? "Chiuso" : "Disponibile"}
                        </span>
                        <button
                          className="add-shift-btn-large"
                          onClick={(e) =>
                            handleAddTurnoClick(dayIndex, slot.index, e)
                          }
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="turni-container">
        <div className="turni-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="turni-container">
      <div className="turni-header-section">
        <h1>📅 Gestione Turni</h1>
        <div className="week-selector">
          <button
            className={`week-button ${selectedWeek === "corrente" ? "active" : ""}`}
            onClick={() => setSelectedWeek("corrente")}
          >
            Corrente ({getWeekRange(0)})
          </button>
          <button
            className={`week-button ${selectedWeek === "prossima" ? "active" : ""}`}
            onClick={() => setSelectedWeek("prossima")}
          >
            Prossima ({getWeekRange(1)})
          </button>
          <button
            className={`week-button ${selectedWeek === "plus2" ? "active" : ""}`}
            onClick={() => setSelectedWeek("plus2")}
          >
            ({getWeekRange(2)})
          </button>
          <button
            className={`week-button ${selectedWeek === "plus3" ? "active" : ""}`}
            onClick={() => setSelectedWeek("plus3")}
          >
            ({getWeekRange(3)})
          </button>
        </div>
        <button onClick={fetchAllTurni} className="refresh-button">
          🔄 Aggiorna
        </button>
      </div>

      {message && (
        <div className={`turni-message ${message.type}`}>
          <div className="message-icon">
            {message.type === "success" ? "✅" : "❌"}
          </div>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="close-message">
            ×
          </button>
        </div>
      )}

      <div className="turni-content">{renderTurniGrid()}</div>

      {isModalOpen && selectedTurno && (
        <div className="turno-modal-overlay" onClick={closeModal}>
          <div
            className="turno-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="turno-modal-header">
              <h3>
                {selectedTurno.assigned ? "Modifica Turno" : "Assegna Turno"}
              </h3>
              <button onClick={closeModal} className="close-button">
                ✕
              </button>
            </div>

            <div className="turno-modal-body">
              {/* MESSAGGIO DI ERRORE MODALE (NUOVO POSIZIONAMENTO) */}
              {modalError && (
                <div className="modal-error-message">{modalError}</div>
              )}

              <div className="turno-info">
                <p>
                  <strong>Data:</strong> {formatDate(selectedTurno.data)}
                </p>
                <p>
                  <strong>Slot:</strong>{" "}
                  {standardSlots[selectedTurno.turno_index]?.label}
                </p>
              </div>

              <div className="form-group-checkbox">
                <input
                  type="checkbox"
                  id="partial-check"
                  checked={isPartialTurno}
                  onChange={(e) => setIsPartialTurno(e.target.checked)}
                />
                <label htmlFor="partial-check">
                  ✏️ Modifica orari (Turno Spezzato/Parziale)
                </label>
              </div>

              {isPartialTurno && (
                <div className="time-inputs-row">
                  <div className="form-group half">
                    <label>Inizio</label>
                    <input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                    />
                  </div>
                  <div className="form-group half">
                    <label>Fine</label>
                    <input
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Utente:</label>
                <input
                  type="text"
                  placeholder="Cerca..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="user-search-input"
                />
                <select
                  value={selectedUserId || ""}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  size={5}
                >
                  <option value="">Seleziona utente</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.surname}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Note:</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="..."
                />
              </div>
            </div>

            <div className="turno-modal-actions">
              {selectedTurno.assigned && (
                <button onClick={handleRimuoviTurno} className="remove-button">
                  Rimuovi
                </button>
              )}
              <div style={{ flex: 1 }}></div>
              <button onClick={closeModal} className="cancel-button">
                Annulla
              </button>
              <button
                onClick={handleAssegnaTurno}
                className="assign-button"
                disabled={!selectedUserId}
              >
                {selectedTurno.assigned ? "Salva" : "Assegna"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Turni;
