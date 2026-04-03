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

const TELEGRAM_CHAT_ID = "@aulastudioforo";

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
  const [orariCorrente, setOrariCorrente] = useState<FasciaOraria[]>([]);
  const [orariProssima, setOrariProssima] = useState<FasciaOraria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [activeMobileTab, setActiveMobileTab] = useState<WeekType>("current");

  const [nuoveFasce, setNuoveFasce] = useState<
    Record<string, Record<WeekType, NuovaFascia[]>>
  >({});
  const [editingId, setEditingId] = useState<{
    id: number;
    week: WeekType;
  } | null>(null);
  const [editData, setEditData] = useState<Partial<FasciaOraria>>({});

  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState("");
  const [selectedOrariKeys, setSelectedOrariKeys] = useState<string[]>([]);
  const [activeTemplate, setActiveTemplate] =
    useState<TemplateType>("settimana");

  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    GIORNI_SETTIMANA.forEach((giorno) => {
      initialExpanded[`current-${giorno}`] = true;
      initialExpanded[`next-${giorno}`] = true;
    });
    setExpandedDays(initialExpanded);
  }, []);

  useEffect(() => {
    fetchOrari();
  }, []);

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
    if (!window.confirm("Sei sicuro di voler eliminare questa fascia oraria?"))
      return;
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

  const toggleDay = (giorno: string, week: WeekType) => {
    const key = `${week}-${giorno}`;
    setExpandedDays((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
      ) {
        delete updated[giorno];
      }
      return updated;
    });
  };

  const toggleSelectOrario = (id: number, week: WeekType) => {
    const uniqueKey = `${week}-${id}`;
    setSelectedOrariKeys((prev) =>
      prev.includes(uniqueKey)
        ? prev.filter((k) => k !== uniqueKey)
        : [...prev, uniqueKey],
    );
  };

  const generateMessageText = (selectedKeys: string[], type: TemplateType) => {
    const selectedOrari: FasciaOraria[] = [];
    let hasCurrent = false;
    let hasNext = false;

    selectedKeys.forEach((key) => {
      const [week, idStr] = key.split("-");
      const id = parseInt(idStr);
      if (week === "current") hasCurrent = true;
      if (week === "next") hasNext = true;
      const sourceArray = week === "current" ? orariCorrente : orariProssima;
      const found = sourceArray.find((o) => o.id === id);
      if (found) selectedOrari.push(found);
    });

    const grouped = groupByDay(selectedOrari);
    let dateRangeString = getCurrentWeek();
    if (hasNext && !hasCurrent) {
      dateRangeString = getNextWeek();
    }

    const footer = `\nC'è sempre bisogno di una mano! \nPer aiutarci a tenere aperta l'Aula studio ed estendere gli orari di apertura entra in contatto con noi! www.foroets.com\nInstagram: @associazioneforo\nTelegram: @AAAdminForo`;

    let text = "";
    if (type === "settimana") {
      text = `<b>ORARI DELLA SETTIMANA:</b>\n${dateRangeString}\n\n`;
    } else if (type === "weekend") {
      text = `<b>ORARI DEL WEEKEND:</b>\n\n`;
    } else {
      text = `<b>APERTURE STRAORDINARIE:</b>\n\n`;
    }

    GIORNI_SETTIMANA.forEach((giorno) => {
      const fasce = grouped[giorno];
      if (fasce && fasce.length > 0) {
        const orariString = fasce
          .map((o) => {
            const times = `${formatTime(o.ora_inizio)}-${formatTime(o.ora_fine)}`;
            return o.note ? `${times} ${o.note}` : times;
          })
          .join(type === "settimana" ? " e " : ", ");
        text += `<b>${giorno.charAt(0).toUpperCase() + giorno.slice(1)}</b> \n${orariString}\n`;
      }
    });

    if (type === "settimana") {
      text += `\nL'aula Agorà per lo studio ad alta voce potrà essere utilizzata come mensa nella fascia oraria 12.30 - 14.30\n`;
    }

    return text + footer;
  };

  const handleOpenTelegramModal = () => {
    if (selectedOrariKeys.length === 0) {
      alert("Seleziona almeno una fascia oraria.");
      return;
    }
    const msg = generateMessageText(selectedOrariKeys, activeTemplate);
    setTelegramMessage(msg);
    setShowTelegramModal(true);
  };

  const handleTemplateChange = (newType: TemplateType) => {
    setActiveTemplate(newType);
    const msg = generateMessageText(selectedOrariKeys, newType);
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

  const renderWeekSection = (
    title: string,
    orari: FasciaOraria[],
    week: WeekType,
    className: string,
  ) => {
    const grouped = groupByDay(orari);
    const isMobileVisible = activeMobileTab === week;

    return (
      <div
        className={`${className} ${isMobileVisible ? "active-on-mobile" : ""}`}
      >
        <div className="week-header-wrapper">
          <h2 className="week-title">{title}</h2>
        </div>

        <div className="orari-list">
          {GIORNI_SETTIMANA.map((giorno) => (
            <div key={`${week}-${giorno}`} className="day-card">
              <div
                className="day-header"
                onClick={() => toggleDay(giorno, week)}
              >
                <div className="day-header-left">
                  <span
                    className={`expand-icon ${expandedDays[`${week}-${giorno}`] ? "expanded" : ""}`}
                  >
                    {expandedDays[`${week}-${giorno}`] ? "-" : "+"}
                  </span>
                  <h3 className="day-title">
                    {giorno.charAt(0).toUpperCase() + giorno.slice(1)}
                  </h3>
                  <span className="orari-count">{grouped[giorno].length}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    aggiungiNuovaFascia(giorno, week);
                    setExpandedDays((prev) => ({
                      ...prev,
                      [`${week}-${giorno}`]: true,
                    }));
                  }}
                  className="btn btn-add"
                  aria-label="Aggiungi fascia"
                >
                  + Aggiungi
                </button>
              </div>

              {expandedDays[`${week}-${giorno}`] && (
                <div className="day-body">
                  {/* Orari Esistenti */}
                  {grouped[giorno].length > 0 && (
                    <div className="existing-orari">
                      {grouped[giorno].map((orario) => (
                        <div
                          key={`${week}-${orario.id}`}
                          className="orario-row"
                        >
                          <div className="orario-checkbox-wrapper">
                            <input
                              type="checkbox"
                              className="orario-checkbox"
                              checked={selectedOrariKeys.includes(
                                `${week}-${orario.id}`,
                              )}
                              onChange={() =>
                                toggleSelectOrario(orario.id, week)
                              }
                            />
                          </div>

                          {editingId?.id === orario.id &&
                          editingId.week === week ? (
                            <div className="edit-mode-container">
                              <div className="edit-inputs">
                                <div className="time-inputs">
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
                                  <span>-</span>
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
                                </div>
                                <input
                                  type="text"
                                  value={editData.note}
                                  placeholder="Aggiungi nota..."
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      note: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="edit-actions">
                                <button
                                  onClick={salvaModifica}
                                  className="btn btn-success btn-small"
                                >
                                  Salva
                                </button>
                                <button
                                  onClick={annullaModifica}
                                  className="btn btn-secondary btn-small"
                                >
                                  Annulla
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="view-mode-container">
                              <div className="orario-info">
                                <div className="time-badges">
                                  <span className="time-badge">
                                    {formatTime(orario.ora_inizio)}
                                  </span>
                                  <span className="time-separator">-</span>
                                  <span className="time-badge">
                                    {formatTime(orario.ora_fine)}
                                  </span>
                                </div>
                                {orario.note && (
                                  <span className="orario-note">
                                    {orario.note}
                                  </span>
                                )}
                              </div>
                              <div className="action-buttons">
                                <button
                                  onClick={() => iniziaModifica(orario, week)}
                                  className="btn btn-icon btn-edit"
                                  title="Modifica"
                                >
                                  Modifica
                                </button>
                                <button
                                  onClick={() => eliminaFascia(orario.id, week)}
                                  className="btn btn-icon btn-delete"
                                  title="Elimina"
                                >
                                  Elimina
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form Nuove Fasce */}
                  {nuoveFasce[giorno]?.[week]?.map((fascia, index) => (
                    <div key={`new-${index}`} className="new-fascia-card">
                      <div className="new-fascia-header">
                        <span>Nuova Fascia</span>
                        <button
                          onClick={() =>
                            rimuoviNuovaFascia(giorno, week, index)
                          }
                          className="btn-close"
                        >
                          X
                        </button>
                      </div>
                      <div className="new-fascia-inputs">
                        <div className="time-inputs">
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
                        </div>
                        <input
                          type="text"
                          className="note-input"
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
                          placeholder="Note aggiuntive (opzionale)"
                        />
                      </div>
                    </div>
                  ))}

                  {grouped[giorno].length === 0 &&
                    (!nuoveFasce[giorno]?.[week] ||
                      nuoveFasce[giorno][week].length === 0) && (
                      <div className="no-orari-state">
                        Nessun orario impostato per questo giorno.
                      </div>
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
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Caricamento orari...</p>
        </div>
      </div>
    );
  }

  const hasNuoveFasce = Object.keys(nuoveFasce).length > 0;

  return (
    <div className="modifica-orari-container">
      <div className="main-header">
        <h1>Gestione Orari</h1>
        <div className="header-actions">
          <button
            onClick={handleOpenTelegramModal}
            className="btn btn-telegram"
            disabled={selectedOrariKeys.length === 0}
          >
            Componi Telegram ({selectedOrariKeys.length})
          </button>
          <button onClick={fetchOrari} className="btn btn-secondary">
            Ricarica Dati
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>X</button>
        </div>
      )}

      <div className="mobile-tabs">
        <button
          className={`tab-btn ${activeMobileTab === "current" ? "active" : ""}`}
          onClick={() => setActiveMobileTab("current")}
        >
          Settimana Corrente
        </button>
        <button
          className={`tab-btn ${activeMobileTab === "next" ? "active" : ""}`}
          onClick={() => setActiveMobileTab("next")}
        >
          Prossima Settimana
        </button>
      </div>

      <div className="grid-container">
        {renderWeekSection(
          `Settimana Corrente (${getCurrentWeek()})`,
          orariCorrente,
          "current",
          "week-column current-week",
        )}
        {renderWeekSection(
          `Prossima Settimana (${getNextWeek()})`,
          orariProssima,
          "next",
          "week-column next-week",
        )}
      </div>

      {hasNuoveFasce && (
        <div className="bottom-action-bar">
          <div className="bottom-bar-content">
            <span className="pending-text">
              Hai delle fasce orarie non salvate.
            </span>
            <button
              onClick={salvaTuttiGliOrari}
              className="btn btn-success btn-large"
            >
              Salva Nuovi Orari
            </button>
          </div>
        </div>
      )}

      {showTelegramModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Componi Messaggio</h2>
              <button
                onClick={() => setShowTelegramModal(false)}
                className="btn-close-modal"
              >
                X
              </button>
            </div>

            <div className="modal-body">
              <div className="template-selector">
                <label>Modello di messaggio:</label>
                <select
                  value={activeTemplate}
                  onChange={(e) =>
                    handleTemplateChange(e.target.value as TemplateType)
                  }
                >
                  <option value="settimana">Settimanale Standard</option>
                  <option value="weekend">Orari Weekend</option>
                  <option value="straordinaria">Apertura Straordinaria</option>
                </select>
              </div>
              <textarea
                value={telegramMessage}
                onChange={(e) => setTelegramMessage(e.target.value)}
                rows={12}
                className="telegram-textarea"
              />
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowTelegramModal(false)}
                className="btn btn-secondary"
              >
                Annulla
              </button>
              <button onClick={handleSendTelegram} className="btn btn-telegram">
                Invia al Gruppo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModificaOrari;
