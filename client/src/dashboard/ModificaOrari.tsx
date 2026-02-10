import React, { useState, useEffect } from "react";
import "../style/modificaOrari.css";

interface FasciaOraria {
  id: number;
  giorno: string;
  ora_inizio: string;
  ora_fine: string;
  note?: string;
}

interface NuovaFascia {
  ora_inizio: string;
  ora_fine: string;
  note: string;
}

interface ApiResponse {
  success: boolean;
  data?: FasciaOraria[];
  error?: string;
}

type WeekType = "current" | "next";
type TemplateType = "settimana" | "weekend" | "straordinaria";

const GIORNI_SETTIMANA = [
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
  "domenica",
];

// ID del gruppo Telegram
const TELEGRAM_CHAT_ID = "-1001544887312";

const getCurrentWeek = (): string => {
  const now = new Date();
  const currentDay = now.getDay();
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const monthName = monday.toLocaleDateString("it-IT", { month: "long" });

  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}-${sunday.getDate()} ${monthName}`;
  } else {
    const sundayMonthName = sunday.toLocaleDateString("it-IT", {
      month: "long",
    });
    return `${monday.getDate()} ${monthName} - ${sunday.getDate()} ${sundayMonthName}`;
  }
};

const getNextWeek = (): string => {
  const now = new Date();
  const currentDay = now.getDay();
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() - daysToMonday + 7);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  const monthName = nextMonday.toLocaleDateString("it-IT", { month: "long" });

  if (nextMonday.getMonth() === nextSunday.getMonth()) {
    return `${nextMonday.getDate()}-${nextSunday.getDate()} ${monthName}`;
  } else {
    const sundayMonthName = nextSunday.toLocaleDateString("it-IT", {
      month: "long",
    });
    return `${nextMonday.getDate()} ${monthName} - ${nextSunday.getDate()} ${sundayMonthName}`;
  }
};

const ModificaOrari: React.FC = () => {
  // Stati Dati
  const [orariCorrente, setOrariCorrente] = useState<FasciaOraria[]>([]);
  const [orariProssima, setOrariProssima] = useState<FasciaOraria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Stati Modifica/Nuovi
  const [nuoveFasce, setNuoveFasce] = useState<
    Record<string, Record<WeekType, NuovaFascia[]>>
  >({});
  const [editingId, setEditingId] = useState<{
    id: number;
    week: WeekType;
  } | null>(null);
  const [editData, setEditData] = useState<Partial<FasciaOraria>>({});

  // Stati Telegram e Selezione Messaggio
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState("");
  const [selectedOrariIds, setSelectedOrariIds] = useState<number[]>([]);
  const [activeTemplate, setActiveTemplate] =
    useState<TemplateType>("settimana");

  useEffect(() => {
    const initialExpanded = GIORNI_SETTIMANA.reduce(
      (acc, giorno) => {
        acc[giorno] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );
    setExpandedDays(initialExpanded);
  }, []);

  useEffect(() => {
    fetchOrari();
  }, []);

  // --- API CALLS ---

  const fetchOrari = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentRes = await fetch("/api/orari_settimana");
      const currentData: ApiResponse = await currentRes.json();
      if (currentData.success) setOrariCorrente(currentData.data || []);

      const nextRes = await fetch("/api/orari_settimana?settimana=next");
      const nextData: ApiResponse = await nextRes.json();
      if (nextData.success) setOrariProssima(nextData.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Errore di connessione al server");
    } finally {
      setLoading(false);
    }
  };

  const salvaFascia = async (
    giorno: string,
    fascia: NuovaFascia,
    week: WeekType,
  ) => {
    if (!fascia.ora_inizio || !fascia.ora_fine) {
      setError("Ora inizio e ora fine sono obbligatorie");
      return false;
    }
    try {
      const body = {
        giorno,
        ora_inizio: fascia.ora_inizio,
        ora_fine: fascia.ora_fine,
        note: fascia.note || null,
        settimana: week === "next" ? "next" : undefined,
      };
      const response = await fetch("/api/orari_settimana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return true;
    } catch (err) {
      setError("Errore nel salvataggio");
      return false;
    }
  };

  const salvaTuttiGliOrari = async () => {
    setLoading(true);
    const promises: Promise<boolean>[] = [];

    for (const giorno of GIORNI_SETTIMANA) {
      if (nuoveFasce[giorno]) {
        for (const week of ["current", "next"] as WeekType[]) {
          if (nuoveFasce[giorno][week]) {
            nuoveFasce[giorno][week].forEach((f) =>
              promises.push(salvaFascia(giorno, f, week)),
            );
          }
        }
      }
    }

    await Promise.all(promises);
    setNuoveFasce({});
    fetchOrari();
    setLoading(false);
  };

  const eliminaFascia = async (id: number, week: WeekType) => {
    if (!confirm("Sei sicuro di voler eliminare questa fascia oraria?")) return;
    try {
      const body = { id, settimana: week === "next" ? "next" : "current" };
      const response = await fetch("/api/orari_settimana", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) fetchOrari();
      else throw new Error(data.error);
    } catch (err) {
      setError("Errore nell'eliminazione");
    }
  };

  // --- FUNZIONI DI MODIFICA (Mancavano queste due!) ---

  const iniziaModifica = (fascia: FasciaOraria, week: WeekType) => {
    setEditingId({ id: fascia.id, week });
    setEditData({
      ora_inizio: fascia.ora_inizio,
      ora_fine: fascia.ora_fine,
      note: fascia.note || "",
    });
  };

  const annullaModifica = () => {
    setEditingId(null);
    setEditData({});
  };

  const salvaModifica = async () => {
    if (!editingId) return;
    try {
      const body = {
        id: editingId.id,
        ...editData,
        settimana: editingId.week === "next" ? "next" : undefined,
      };
      const response = await fetch("/api/orari_settimana", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        fetchOrari();
        setEditingId(null);
        setEditData({});
      }
    } catch (err) {
      setError("Errore nell'aggiornamento");
    }
  };

  // --- LOGICA UTILS ---

  const groupByDay = (orari: FasciaOraria[]) => {
    return GIORNI_SETTIMANA.reduce(
      (acc, giorno) => {
        acc[giorno] = orari
          .filter((o) => o.giorno === giorno)
          .sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));
        return acc;
      },
      {} as Record<string, FasciaOraria[]>,
    );
  };

  const formatTime = (time: string) => {
    if (time.includes(":")) return time;
    const hours = Math.floor(parseFloat(time));
    const minutes = Math.round((parseFloat(time) - hours) * 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  // --- LOGICA NUOVE FASCE ---

  const aggiungiNuovaFascia = (giorno: string, week: WeekType) => {
    setNuoveFasce((prev) => {
      const existing = prev[giorno] || { current: [], next: [] };
      return {
        ...prev,
        [giorno]: {
          ...existing,
          [week]: [
            ...existing[week],
            { ora_inizio: "09:00", ora_fine: "19:30", note: "" },
          ],
        },
      };
    });
  };

  const aggiornaNuovaFascia = (
    giorno: string,
    week: WeekType,
    index: number,
    field: keyof NuovaFascia,
    value: string,
  ) => {
    setNuoveFasce((prev) => {
      const updated = { ...prev };
      updated[giorno][week][index] = {
        ...updated[giorno][week][index],
        [field]: value,
      };
      return updated;
    });
  };

  const rimuoviNuovaFascia = (
    giorno: string,
    week: WeekType,
    index: number,
  ) => {
    setNuoveFasce((prev) => {
      const updated = { ...prev };
      updated[giorno][week] = updated[giorno][week].filter(
        (_, i) => i !== index,
      );
      if (
        updated[giorno].current.length === 0 &&
        updated[giorno].next.length === 0
      )
        delete updated[giorno];
      return updated;
    });
  };

  // --- TELEGRAM LOGIC ---

  const toggleSelectOrario = (id: number) => {
    setSelectedOrariIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const generateMessageText = (selectedIds: number[], type: TemplateType) => {
    // Uniamo tutti gli orari disponibili per cercare quelli selezionati
    const allOrari = [...orariCorrente, ...orariProssima];
    const filtered = allOrari.filter((o) => selectedIds.includes(o.id));
    const grouped = groupByDay(filtered);

    // Footer Standard
    const footer = `\nC'è sempre bisogno di una mano! \nPer aiutarci a tenere aperta l'Aula studio ed estendere gli orari di apertura entra in contatto con noi! www.foroets.com\nInstagram: @associazioneforo\nTelegram: @AAAdminForo`;

    let text = "";

    // Header in base al template
    if (type === "settimana") {
      text = `<b>ORARI DELLA SETTIMANA:</b>\n${getCurrentWeek()}\n\n`;
    } else if (type === "weekend") {
      text = `<b>ORARI DEL WEEKEND:</b>\n\n`;
    } else {
      text = `<b>APERTURE STRAORDINARIE:</b>\n\n`;
    }

    // Corpo del messaggio
    GIORNI_SETTIMANA.forEach((giorno) => {
      const fasce = grouped[giorno];
      if (fasce && fasce.length > 0) {
        // Formattazione: "Martedì 09:00-19:30" oppure unione con " e " se ci sono più fasce
        const orariString = fasce
          .map((o) => {
            const times = `${formatTime(o.ora_inizio)}-${formatTime(o.ora_fine)}`;
            return o.note ? `${times} ${o.note}` : times;
          })
          .join(type === "settimana" ? " e " : ", "); // Nella settimana usiamo "e", nel weekend ","

        // Aggiungi riga
        text += `<b>${giorno.charAt(0).toUpperCase() + giorno.slice(1)}</b> \n${orariString}\n`;
      }
    });

    // Info Mensa solo per settimanale
    if (type === "settimana") {
      text += `\nL'aula Agorà per lo studio ad alta voce potrà essere utilizzata come mensa nella fascia oraria 12.30 - 14.30\n`;
    }

    return text + footer;
  };

  const handleOpenTelegramModal = () => {
    if (selectedOrariIds.length === 0) {
      alert(
        "Seleziona almeno una fascia oraria cliccando sulle caselle di controllo accanto agli orari.",
      );
      return;
    }
    const msg = generateMessageText(selectedOrariIds, activeTemplate);
    setTelegramMessage(msg);
    setShowTelegramModal(true);
  };

  const handleTemplateChange = (newType: TemplateType) => {
    setActiveTemplate(newType);
    const msg = generateMessageText(selectedOrariIds, newType);
    setTelegramMessage(msg);
  };

  const handleSendTelegram = async () => {
    try {
      const response = await fetch("/api/send-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: TELEGRAM_CHAT_ID,
          message: telegramMessage,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      alert("Messaggio inviato con successo al gruppo!");
      setShowTelegramModal(false);
    } catch (err) {
      console.error("Errore Telegram:", err);
      alert("Errore nell'invio del messaggio");
    }
  };

  // --- RENDER ---

  const renderWeekSection = (
    title: string,
    orari: FasciaOraria[],
    week: WeekType,
    className: string,
  ) => {
    const grouped = groupByDay(orari);

    return (
      <div className={className}>
        <h2 className="week-title">{title}</h2>
        <div className="orari-list">
          {GIORNI_SETTIMANA.map((giorno) => (
            <div key={`${week}-${giorno}`} className="day-section">
              <div
                className="day-header"
                onClick={() =>
                  setExpandedDays((p) => ({ ...p, [giorno]: !p[giorno] }))
                }
              >
                <h3 className="day-title">
                  {giorno.charAt(0).toUpperCase() + giorno.slice(1)}{" "}
                  <span className="orari-count">
                    ({grouped[giorno].length})
                  </span>
                </h3>
                <div className="day-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      aggiungiNuovaFascia(giorno, week);
                    }}
                    className="btn btn-add"
                  >
                    + Aggiungi
                  </button>
                  <span
                    className={`expand-icon ${expandedDays[giorno] ? "expanded" : ""}`}
                  >
                    ▼
                  </span>
                </div>
              </div>

              {expandedDays[giorno] && (
                <div className="day-content">
                  {grouped[giorno].length > 0 && (
                    <div className="existing-orari">
                      {grouped[giorno].map((orario) => (
                        <div
                          key={orario.id}
                          className="orario-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          {/* CHECKBOX SELEZIONE */}
                          <input
                            type="checkbox"
                            className="orario-checkbox"
                            checked={selectedOrariIds.includes(orario.id)}
                            onChange={() => toggleSelectOrario(orario.id)}
                            style={{
                              transform: "scale(1.5)",
                              cursor: "pointer",
                            }}
                          />

                          {editingId?.id === orario.id &&
                          editingId.week === week ? (
                            <div className="edit-form">
                              <input
                                type="time"
                                value={editData.ora_inizio}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    ora_inizio: e.target.value,
                                  })
                                }
                              />
                              <input
                                type="time"
                                value={editData.ora_fine}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    ora_fine: e.target.value,
                                  })
                                }
                              />
                              <input
                                type="text"
                                value={editData.note}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    note: e.target.value,
                                  })
                                }
                              />
                              <button
                                onClick={salvaModifica}
                                className="btn btn-success btn-small"
                              >
                                ✓
                              </button>
                              <button
                                onClick={annullaModifica}
                                className="btn btn-secondary btn-small"
                              >
                                ✗
                              </button>
                            </div>
                          ) : (
                            <div className="orario-display" style={{ flex: 1 }}>
                              <div className="orario-time">
                                <span className="time-badge">
                                  {formatTime(orario.ora_inizio)}
                                </span>
                                <span>-</span>
                                <span className="time-badge">
                                  {formatTime(orario.ora_fine)}
                                </span>
                              </div>
                              {orario.note && (
                                <div className="orario-note">{orario.note}</div>
                              )}
                              <div className="orario-actions">
                                <button
                                  onClick={() => {
                                    iniziaModifica(orario, week);
                                  }}
                                  className="btn btn-edit btn-small"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => {
                                    eliminaFascia(orario.id, week);
                                  }}
                                  className="btn btn-delete btn-small"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* FORM NUOVE FASCE */}
                  {nuoveFasce[giorno]?.[week]?.map((fascia, index) => (
                    <div key={index} className="new-fascia-form">
                      <input
                        type="time"
                        value={fascia.ora_inizio}
                        onChange={(e) =>
                          aggiornaNuovaFascia(
                            giorno,
                            week,
                            index,
                            "ora_inizio",
                            e.target.value,
                          )
                        }
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={fascia.ora_fine}
                        onChange={(e) =>
                          aggiornaNuovaFascia(
                            giorno,
                            week,
                            index,
                            "ora_fine",
                            e.target.value,
                          )
                        }
                      />
                      <input
                        type="text"
                        value={fascia.note}
                        onChange={(e) =>
                          aggiornaNuovaFascia(
                            giorno,
                            week,
                            index,
                            "note",
                            e.target.value,
                          )
                        }
                        placeholder="Note"
                      />
                      <button
                        onClick={() => rimuoviNuovaFascia(giorno, week, index)}
                        className="btn btn-delete btn-small"
                      >
                        ✗
                      </button>
                    </div>
                  ))}

                  {grouped[giorno].length === 0 &&
                    (!nuoveFasce[giorno]?.[week] ||
                      nuoveFasce[giorno][week].length === 0) && (
                      <div className="no-orari">Nessun orario impostato</div>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading && orariCorrente.length === 0 && orariProssima.length === 0) {
    return (
      <div className="modifica-orari-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>Caricamento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="modifica-orari-container">
      <div className="modifica-orari-header">
        <h1>Gestione Orari</h1>
        <div className="header-actions">
          <button
            onClick={handleOpenTelegramModal}
            className="btn"
            style={{
              backgroundColor: "#0088cc",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
            disabled={selectedOrariIds.length === 0}
          >
            📢 Componi Telegram ({selectedOrariIds.length})
          </button>
          <button onClick={fetchOrari} className="btn btn-refresh">
            🔄 Ricarica
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-error">
            ×
          </button>
        </div>
      )}

      <div className="weeks-container">
        {renderWeekSection(
          `Settimana Corrente (${getCurrentWeek()})`,
          orariCorrente,
          "current",
          "week-section current-week",
        )}
        {renderWeekSection(
          `Prossima Settimana (${getNextWeek()})`,
          orariProssima,
          "next",
          "week-section next-week",
        )}
      </div>

      {Object.keys(nuoveFasce).length > 0 && (
        <div className="bottom-save-section">
          <button
            onClick={salvaTuttiGliOrari}
            className="btn btn-success btn-large"
          >
            💾 Salva Nuovi Orari
          </button>
        </div>
      )}

      {/* MODALE TELEGRAM */}
      {showTelegramModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "600px", width: "90%" }}
          >
            <h2>Configura Messaggio Telegram</h2>

            <div
              style={{
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "#f5f5f5",
                borderRadius: "5px",
              }}
            >
              <label style={{ fontWeight: "bold", marginRight: "10px" }}>
                Tipo messaggio:
              </label>
              <select
                value={activeTemplate}
                onChange={(e) =>
                  handleTemplateChange(e.target.value as TemplateType)
                }
                style={{
                  padding: "5px",
                  fontSize: "16px",
                  borderRadius: "4px",
                }}
              >
                <option value="settimana">Settimanale Standard</option>
                <option value="weekend">Orari Weekend</option>
                <option value="straordinaria">Apertura Straordinaria</option>
              </select>
            </div>

            <textarea
              value={telegramMessage}
              onChange={(e) => setTelegramMessage(e.target.value)}
              rows={15}
              style={{
                width: "100%",
                fontFamily: "monospace",
                padding: "10px",
                fontSize: "14px",
                lineHeight: "1.4",
              }}
            />

            <div
              className="modal-actions"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "15px",
              }}
            >
              <button
                onClick={() => setShowTelegramModal(false)}
                className="btn btn-secondary"
              >
                Annulla
              </button>
              <button onClick={handleSendTelegram} className="btn btn-success">
                Invia al Gruppo ✈️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModificaOrari;
