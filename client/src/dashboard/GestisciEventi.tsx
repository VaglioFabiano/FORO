import React, { useState, useEffect, useCallback } from "react";
import "../style/gestisciEventi.css";

// Definizione delle interfacce per i dati
interface Evento {
  id: number;
  titolo: string;
  descrizione: string;
  data_evento: string;
  immagine_url?: string;
  immagine_blob?: string; // Base64 encoded image
  immagine_tipo?: string;
  immagine_nome?: string;
}

interface Prenotazione {
  id: number;
  evento_id: number;
  nome: string;
  cognome: string;
  email: string;
  data_prenotazione: string;
  num_biglietti?: number;
  num_partecipanti?: number; // Aggiunto per compatibilità
  note?: string;
}

interface NuovoEvento {
  titolo: string;
  descrizione: string;
  data_evento: string;
  immagine_url: string;
  immagine_file?: File;
}

interface BroadcastEmail {
  subject: string;
  message: string;
}

interface ApiResponse {
  success: boolean;
  eventi?: Evento[];
  evento?: Evento;
  prenotazioni?: Prenotazione[];
  error?: string;
  message?: string;
  evento_id?: number;
  broadcast_details?: any;
  destinatari_count?: number;
}

const GestisciEventi: React.FC = () => {
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [prenotazioni, setPrenotazioni] = useState<
    Record<number, Prenotazione[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>(
    {},
  );

  // Stato per nuovo evento
  const [nuovoEvento, setNuovoEvento] = useState<NuovoEvento>({
    titolo: "",
    descrizione: "",
    data_evento: "",
    immagine_url: "",
  });
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Stato per modifica evento
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editData, setEditData] = useState<
    Partial<Evento & { immagine_file?: File }>
  >({});
  const [updatingEvent, setUpdatingEvent] = useState(false);

  // Stato per email broadcast
  const [broadcastEventId, setBroadcastEventId] = useState<number | null>(null);
  const [broadcastData, setBroadcastData] = useState<BroadcastEmail>({
    subject: "",
    message: "",
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  // Stato per l'utente loggato
  const [userLevel, setUserLevel] = useState<number>(-1);
  const [userId, setUserId] = useState<number | null>(null);

  // Gestione timer messaggi
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (broadcastSuccess) {
      const timer = setTimeout(() => setBroadcastSuccess(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [broadcastSuccess]);

  // --- NUOVA FUNZIONE DI COMPRESSIONE IMMAGINI ---
  // Risolve il problema del payload troppo grande per il database
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const maxWidth = 800; // Limita larghezza
      const maxHeight = 800; // Limita altezza
      const reader = new FileReader();

      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Ridimensiona mantenendo le proporzioni
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Errore compressione immagine"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Comprimi a JPEG qualità 0.7
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const validateImageFile = (file: File): boolean => {
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    const maxSize = 10 * 1024 * 1024; // Accetta file grandi in input (poi li comprimiamo)

    if (!validTypes.includes(file.type)) {
      setError("Tipo di file non supportato. Usa JPG, PNG, GIF o WebP.");
      return false;
    }

    if (file.size > maxSize) {
      setError("File troppo grande. Dimensione massima: 10MB.");
      return false;
    }

    return true;
  };

  // --- API CALLS ---

  const fetchEventi = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/eventi");

      if (!response.ok) {
        throw new Error("Errore caricamento eventi");
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Errore sconosciuto");
      }

      const fetchedEventi = data.eventi || [];
      setEventi(fetchedEventi);

      if (fetchedEventi.length > 0) {
        await Promise.all(
          fetchedEventi.map((evento) => fetchPrenotazioni(evento.id)),
        );
      }
    } catch (err) {
      console.error("Fetch eventi error:", err);
      setError(err instanceof Error ? err.message : "Errore connessione");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrenotazioni = useCallback(async (eventoId: number) => {
    try {
      const response = await fetch(
        `/api/eventi?section=prenotazioni&evento_id=${eventoId}`,
      );
      if (!response.ok) return;

      const data: ApiResponse = await response.json();
      if (data.success && data.prenotazioni) {
        setPrenotazioni((prev) => ({
          ...prev,
          [eventoId]: data.prenotazioni || [],
        }));
      }
    } catch (err) {
      console.error("Errore caricamento prenotazioni:", err);
    }
  }, []);

  useEffect(() => {
    setUserLevel(1); // Simulazione Admin
    setUserId(1);
    fetchEventi();
  }, [fetchEventi]);

  // --- AZIONI ---

  const inviaEmailBroadcast = async () => {
    if (
      !broadcastEventId ||
      !broadcastData.subject.trim() ||
      !broadcastData.message.trim()
    ) {
      setError("Oggetto e messaggio obbligatori.");
      return;
    }

    const numDestinatari = (prenotazioni[broadcastEventId] || []).length;
    if (numDestinatari === 0) {
      setError("Nessun partecipante a cui scrivere.");
      return;
    }

    setSendingBroadcast(true);
    setError(null);
    setBroadcastSuccess(null);

    try {
      const response = await fetch("/api/eventi?section=broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento_id: broadcastEventId,
          subject: broadcastData.subject.trim(),
          message: broadcastData.message.trim(),
          user_id: userId,
        }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        setBroadcastSuccess(
          `✅ Email inviate a ${data.destinatari_count} partecipanti!`,
        );
        setBroadcastData({ subject: "", message: "" });
        setBroadcastEventId(null);
      } else {
        throw new Error(data.error || "Errore invio.");
      }
    } catch (err) {
      console.error("Broadcast error:", err);
      setError(err instanceof Error ? err.message : "Errore invio email.");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const creaEvento = async () => {
    if (!nuovoEvento.titolo.trim() || !nuovoEvento.data_evento.trim()) {
      setError("Titolo e data obbligatori.");
      return;
    }

    setCreatingEvent(true);
    setError(null);

    try {
      let eventData: any = {
        titolo: nuovoEvento.titolo.trim(),
        descrizione: nuovoEvento.descrizione.trim(),
        data_evento: nuovoEvento.data_evento.trim(),
        immagine_url: nuovoEvento.immagine_url.trim(),
        user_id: userId,
      };

      if (nuovoEvento.immagine_file) {
        if (!validateImageFile(nuovoEvento.immagine_file)) {
          setCreatingEvent(false);
          return;
        }
        // Compressione obbligatoria
        const compressedBase64 = await compressImage(nuovoEvento.immagine_file);
        eventData.immagine_blob = compressedBase64;
        eventData.immagine_tipo = "image/jpeg";
        eventData.immagine_nome = nuovoEvento.immagine_file.name;
      }

      const response = await fetch("/api/eventi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      const data = await response.json();

      if (data.success) {
        setNuovoEvento({
          titolo: "",
          descrizione: "",
          data_evento: "",
          immagine_url: "",
        });
        setShowNewEventForm(false);
        await fetchEventi();
      } else {
        throw new Error(data.error || "Errore creazione.");
      }
    } catch (err) {
      console.error("Create error:", err);
      setError(err instanceof Error ? err.message : "Errore server.");
    } finally {
      setCreatingEvent(false);
    }
  };

  const aggiornaEvento = async () => {
    if (!editingEventId || !editData.titolo?.trim()) {
      setError("Titolo obbligatorio.");
      return;
    }

    setUpdatingEvent(true);
    setError(null);

    try {
      let eventData: any = {
        id: editingEventId,
        titolo: editData.titolo.trim(),
        descrizione: editData.descrizione?.trim() || "",
        data_evento: editData.data_evento?.trim(),
        immagine_url: editData.immagine_url?.trim() || "",
        user_id: userId,
      };

      if (editData.immagine_file) {
        if (!validateImageFile(editData.immagine_file)) {
          setUpdatingEvent(false);
          return;
        }
        const compressedBase64 = await compressImage(editData.immagine_file);
        eventData.immagine_blob = compressedBase64;
        eventData.immagine_tipo = "image/jpeg";
        eventData.immagine_nome = editData.immagine_file.name;
      }

      const response = await fetch("/api/eventi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      const data = await response.json();

      if (data.success) {
        setEditingEventId(null);
        setEditData({});
        await fetchEventi();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore aggiornamento.");
    } finally {
      setUpdatingEvent(false);
    }
  };

  const eliminaEvento = async (eventoId: number) => {
    if (!confirm("Eliminare evento e tutte le prenotazioni?")) return;

    setError(null);
    try {
      const response = await fetch("/api/eventi", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventoId, user_id: userId }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchEventi();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore eliminazione.");
    }
  };

  // --- HANDLERS UI ---

  const handleNewEventImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file)
      setNuovoEvento({ ...nuovoEvento, immagine_file: file, immagine_url: "" });
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file)
      setEditData({ ...editData, immagine_file: file, immagine_url: "" });
  };

  const getImageUrl = (evento: Evento) => {
    return evento.immagine_blob || evento.immagine_url || "";
  };

  const iniziaModifica = (evento: Evento) => {
    setEditingEventId(evento.id);
    setEditData({
      titolo: evento.titolo,
      descrizione: evento.descrizione,
      data_evento: evento.data_evento.split("T")[0],
      immagine_url: evento.immagine_url || "",
    });
  };

  const annullaModifica = () => {
    setEditingEventId(null);
    setEditData({});
    setError(null);
  };

  const iniziaBroadcast = (eventoId: number) => {
    const evento = eventi.find((e) => e.id === eventoId);
    if (!evento) return;
    setBroadcastEventId(eventoId);
    setBroadcastData({
      subject: `Aggiornamento: ${evento.titolo}`,
      message: `Ciao!\n\nCi sono novità per l'evento "${evento.titolo}".\n\n[Scrivi qui il messaggio]\n\nSaluti,\nStaff`,
    });
    setError(null);
    setBroadcastSuccess(null);
  };

  const annullaBroadcast = () => {
    setBroadcastEventId(null);
    setBroadcastData({ subject: "", message: "" });
    setError(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("it-IT", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getParticipantCount = (eventoId: number) => {
    const list = prenotazioni[eventoId] || [];
    return list.reduce(
      (acc, p) => acc + (p.num_biglietti || p.num_partecipanti || 1),
      0,
    );
  };

  const canManageEvents = () => userLevel >= 0 && userLevel <= 2;

  const toggleEvent = (eventoId: number) => {
    setExpandedEvents((prev) => ({ ...prev, [eventoId]: !prev[eventoId] }));
  };

  // --- RENDER ---

  if (loading && eventi.length === 0) {
    return (
      <div className="eventi-container">
        <div className="eventi-loading">
          <div className="loading-spinner"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="eventi-container">
      <div className="eventi-header-section">
        <h1>🎭 Gestione Eventi</h1>
        <div className="eventi-actions">
          {canManageEvents() && (
            <button
              onClick={() => {
                setShowNewEventForm(!showNewEventForm);
                if (showNewEventForm) setError(null);
              }}
              className={`action-button ${showNewEventForm ? "cancel" : "create"}`}
            >
              {showNewEventForm ? "✕ Chiudi" : "✨ Nuovo Evento"}
            </button>
          )}
          <button
            onClick={fetchEventi}
            className="refresh-button"
            disabled={loading}
          >
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {error && (
        <div className="eventi-message error">
          <div className="message-icon">❌</div>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-message">
            ×
          </button>
        </div>
      )}

      {broadcastSuccess && (
        <div className="eventi-message success">
          <div className="message-icon">✅</div>
          <span>{broadcastSuccess}</span>
          <button
            onClick={() => setBroadcastSuccess(null)}
            className="close-message"
          >
            ×
          </button>
        </div>
      )}

      {/* BROADCAST FORM */}
      {broadcastEventId && (
        <div className="broadcast-form">
          <div className="form-header">
            <h2>📧 Invia Email ai Partecipanti</h2>
            <p>
              Evento:{" "}
              <strong>
                {eventi.find((e) => e.id === broadcastEventId)?.titolo}
              </strong>{" "}
              ({(prenotazioni[broadcastEventId] || []).length} destinatari)
            </p>
          </div>
          <div className="form-content">
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Oggetto *</label>
                <input
                  type="text"
                  value={broadcastData.subject}
                  onChange={(e) =>
                    setBroadcastData({
                      ...broadcastData,
                      subject: e.target.value,
                    })
                  }
                  disabled={sendingBroadcast}
                />
              </div>
              <div className="form-group full-width">
                <label>Messaggio *</label>
                <textarea
                  rows={6}
                  value={broadcastData.message}
                  onChange={(e) =>
                    setBroadcastData({
                      ...broadcastData,
                      message: e.target.value,
                    })
                  }
                  disabled={sendingBroadcast}
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                onClick={inviaEmailBroadcast}
                className="btn-send-broadcast"
                disabled={sendingBroadcast}
              >
                {sendingBroadcast ? "Invio in corso..." : "📧 Invia Email"}
              </button>
              <button
                onClick={annullaBroadcast}
                className="btn-cancel"
                disabled={sendingBroadcast}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NUOVO EVENTO FORM */}
      {showNewEventForm && canManageEvents() && (
        <div className="new-event-form">
          <div className="form-header">
            <h2>✨ Nuovo Evento</h2>
          </div>
          <div className="form-content">
            <div className="form-grid">
              <div className="form-group">
                <label>Titolo *</label>
                <input
                  type="text"
                  value={nuovoEvento.titolo}
                  onChange={(e) =>
                    setNuovoEvento({ ...nuovoEvento, titolo: e.target.value })
                  }
                  disabled={creatingEvent}
                />
              </div>
              <div className="form-group">
                <label>Data *</label>
                <input
                  type="date"
                  value={nuovoEvento.data_evento}
                  onChange={(e) =>
                    setNuovoEvento({
                      ...nuovoEvento,
                      data_evento: e.target.value,
                    })
                  }
                  disabled={creatingEvent}
                />
              </div>
              <div className="form-group full-width">
                <label>Descrizione</label>
                <textarea
                  rows={3}
                  value={nuovoEvento.descrizione}
                  onChange={(e) =>
                    setNuovoEvento({
                      ...nuovoEvento,
                      descrizione: e.target.value,
                    })
                  }
                  disabled={creatingEvent}
                />
              </div>
              <div className="form-group">
                <label>Immagine (File)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewEventImageChange}
                  disabled={creatingEvent}
                />
                <p className="form-help">Verrà compressa automaticamente.</p>
              </div>
              <div className="form-group">
                <label>Oppure URL Immagine</label>
                <input
                  type="url"
                  value={nuovoEvento.immagine_url}
                  onChange={(e) =>
                    setNuovoEvento({
                      ...nuovoEvento,
                      immagine_url: e.target.value,
                      immagine_file: undefined,
                    })
                  }
                  disabled={creatingEvent}
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                onClick={creaEvento}
                className="btn-create"
                disabled={creatingEvent}
              >
                {creatingEvent ? "Salvataggio..." : "💾 Crea"}
              </button>
              <button
                onClick={() => setShowNewEventForm(false)}
                className="btn-cancel"
                disabled={creatingEvent}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTA EVENTI */}
      <div className="eventi-content">
        {eventi.length > 0 ? (
          <div className="eventi-grid">
            {eventi.map((evento) => (
              <div key={evento.id} className="event-card">
                <div
                  className="event-header"
                  onClick={() => toggleEvent(evento.id)}
                >
                  <div className="event-image">
                    {getImageUrl(evento) ? (
                      <img src={getImageUrl(evento)} alt={evento.titolo} />
                    ) : (
                      <div className="no-image">
                        <span>🖼️</span>
                      </div>
                    )}
                  </div>
                  <div className="event-info">
                    <div className="event-title">
                      <h3>{evento.titolo}</h3>
                      <span className="participant-count">
                        {getParticipantCount(evento.id)} iscritti
                      </span>
                    </div>
                    <div className="event-date">
                      📅 {formatDate(evento.data_evento)}
                    </div>
                  </div>
                  <div className="event-actions">
                    {canManageEvents() && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            iniziaBroadcast(evento.id);
                          }}
                          className="btn-broadcast"
                          title="Email"
                          disabled={broadcastEventId === evento.id}
                        >
                          📧
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            iniziaModifica(evento);
                          }}
                          className="btn-edit"
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminaEvento(evento.id);
                          }}
                          className="btn-delete"
                          title="Elimina"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                    <span
                      className={`expand-icon ${expandedEvents[evento.id] ? "expanded" : ""}`}
                    >
                      ▼
                    </span>
                  </div>
                </div>

                {expandedEvents[evento.id] && (
                  <div className="event-content">
                    {editingEventId === evento.id ? (
                      <div className="edit-form">
                        <h4>Modifica Evento</h4>
                        <div className="form-grid">
                          <div className="form-group">
                            <label>Titolo</label>
                            <input
                              type="text"
                              value={editData.titolo || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  titolo: e.target.value,
                                })
                              }
                              disabled={updatingEvent}
                            />
                          </div>
                          <div className="form-group">
                            <label>Data</label>
                            <input
                              type="date"
                              value={editData.data_evento || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  data_evento: e.target.value,
                                })
                              }
                              disabled={updatingEvent}
                            />
                          </div>
                          <div className="form-group full-width">
                            <label>Descrizione</label>
                            <textarea
                              value={editData.descrizione || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  descrizione: e.target.value,
                                })
                              }
                              disabled={updatingEvent}
                            />
                          </div>
                          <div className="form-group">
                            <label>Nuova Immagine</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditImageChange}
                              disabled={updatingEvent}
                            />
                          </div>
                        </div>
                        <div className="form-actions">
                          <button
                            onClick={aggiornaEvento}
                            className="btn-save"
                            disabled={updatingEvent}
                          >
                            Salva
                          </button>
                          <button
                            onClick={annullaModifica}
                            className="btn-cancel"
                            disabled={updatingEvent}
                          >
                            Annulla
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="event-description">
                          <p>{evento.descrizione || "Nessuna descrizione."}</p>
                        </div>
                        <div className="prenotazioni-section">
                          <h4>Prenotazioni</h4>
                          {(prenotazioni[evento.id] || []).length > 0 ? (
                            <div className="prenotazioni-list">
                              {prenotazioni[evento.id].map((pren) => (
                                <div
                                  key={pren.id}
                                  className="prenotazione-item"
                                >
                                  <div className="prenotazione-info">
                                    <div className="partecipante-nome">
                                      👤 {pren.nome} {pren.cognome}
                                    </div>
                                    <div className="partecipante-email">
                                      📧 {pren.email}
                                    </div>
                                    <div className="num-biglietti">
                                      🎟️{" "}
                                      {pren.num_biglietti ||
                                        pren.num_partecipanti ||
                                        1}{" "}
                                      biglietti
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="no-prenotazioni">
                              <p>Nessuna prenotazione.</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-eventi">
            <h2>Nessun evento</h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestisciEventi;
