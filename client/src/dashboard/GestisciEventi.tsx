import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Edit,
  Trash2,
  ChevronDown,
  Search,
  Plus,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
import "../style/gestisciEventi.css";

// --- INTERFACCE DATI ---
interface Evento {
  id: number;
  titolo: string;
  descrizione: string;
  data_evento: string;
  immagine_url?: string;
  immagine_blob?: string;
  immagine_tipo?: string;
  immagine_nome?: string;
  visibile: number;
  num_max?: number;
}

interface Prenotazione {
  id: number;
  evento_id: number;
  nome: string;
  cognome: string;
  email: string;
  data_prenotazione: string;
  num_partecipanti?: number;
  num_arrivati?: number;
  note?: string;
}

interface NuovoEvento {
  titolo: string;
  descrizione: string;
  data_evento: string;
  immagine_url: string;
  immagine_file?: File;
  num_max: number | "";
}

interface ApiResponse {
  success: boolean;
  eventi?: Evento[];
  prenotazioni?: Prenotazione[];
  error?: string;
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
  const [searchQuery, setSearchQuery] = useState<Record<number, string>>({});

  // Timestamp per forzare il refresh delle immagini esterne e ignorare la cache
  const [renderTime] = useState(Date.now());

  const [nuovoEvento, setNuovoEvento] = useState<NuovoEvento>({
    titolo: "",
    descrizione: "",
    data_evento: "",
    immagine_url: "",
    num_max: "",
  });
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);

  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editData, setEditData] = useState<
    Partial<Evento & { immagine_file?: File }>
  >({});
  const [updatingEvent, setUpdatingEvent] = useState(false);

  const [broadcastEventId, setBroadcastEventId] = useState<number | null>(null);
  const [broadcastData, setBroadcastData] = useState({
    subject: "",
    message: "",
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  // --- LOGICA IMMAGINI ---
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1080;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
      };
      reader.onerror = reject;
    });
  };

  const getImageUrl = (evento: Evento) => {
    // 1. Se il database restituisce direttamente la stringa base64 (inizia con data:image), la usiamo subito!
    if (
      evento.immagine_blob &&
      typeof evento.immagine_blob === "string" &&
      evento.immagine_blob.startsWith("data:image")
    ) {
      return evento.immagine_blob;
    }
    // 2. Altrimenti usa l'URL salvato o l'API endpoint, aggiungendo un timestamp per bypassare la cache
    const base =
      evento.immagine_url || `/api/eventi?action=image&id=${evento.id}`;
    return `${base}${base.includes("?") ? "&" : "?"}t=${renderTime}`;
  };

  // --- API CALLS ---
  const fetchEventi = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch("/api/eventi");
      const data: ApiResponse = await res.json();
      if (data.success) {
        setEventi(data.eventi || []);
        // Fetch parallelo delle prenotazioni per ogni evento
        data.eventi?.forEach((ev) => fetchPrenotazioni(ev.id));
      }
    } catch (err) {
      if (!isBackground) setError("Errore connessione server");
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  const fetchPrenotazioni = async (eventoId: number) => {
    try {
      const res = await fetch(
        `/api/eventi?section=prenotazioni&evento_id=${eventoId}`,
      );
      const data: ApiResponse = await res.json();
      if (data.success)
        setPrenotazioni((prev) => ({
          ...prev,
          [eventoId]: data.prenotazioni || [],
        }));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEventi();
  }, [fetchEventi]);

  const toggleVisibility = async (id: number, current: number) => {
    const newVis = current === 1 ? 0 : 1;
    try {
      const res = await fetch("/api/eventi?section=visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, visibile: newVis }),
      });
      if ((await res.json()).success) fetchEventi(true);
    } catch (e) {
      setError("Errore visibilità");
    }
  };

  const handleCheckin = async (pId: number, eId: number, count: number) => {
    try {
      // Aggiornamento ottimistico dell'UI per reattività immediata
      setPrenotazioni((prev) => ({
        ...prev,
        [eId]: prev[eId].map((p) =>
          p.id === pId ? { ...p, num_arrivati: count } : p,
        ),
      }));
      await fetch("/api/eventi?section=checkin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pId, num_arrivati: count }),
      });
    } catch (e) {
      setError("Errore check-in");
    }
  };

  const deleteEvento = async (id: number) => {
    if (
      !confirm(
        "Eliminare definitivamente l'evento e tutte le prenotazioni collegate?",
      )
    )
      return;
    try {
      const res = await fetch("/api/eventi", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if ((await res.json()).success) fetchEventi(true);
    } catch (e) {
      setError("Errore eliminazione");
    }
  };

  const submitNuovoEvento = async () => {
    if (!nuovoEvento.titolo || !nuovoEvento.data_evento)
      return setError("Titolo e data obbligatori");
    setCreatingEvent(true);
    try {
      const body: any = { ...nuovoEvento, num_max: nuovoEvento.num_max || 0 };
      if (nuovoEvento.immagine_file) {
        body.immagine_blob = await compressImage(nuovoEvento.immagine_file);
        body.immagine_tipo = "image/jpeg";
      }
      const res = await fetch("/api/eventi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if ((await res.json()).success) {
        setShowNewEventForm(false);
        setNuovoEvento({
          titolo: "",
          descrizione: "",
          data_evento: "",
          immagine_url: "",
          num_max: "",
        });
        fetchEventi();
      }
    } catch (e) {
      setError("Errore creazione");
    } finally {
      setCreatingEvent(false);
    }
  };

  const saveEdit = async () => {
    setUpdatingEvent(true);
    try {
      const body: any = { ...editData, id: editingEventId };
      if (editData.immagine_file) {
        body.immagine_blob = await compressImage(editData.immagine_file);
        body.immagine_tipo = "image/jpeg";
      }
      const res = await fetch("/api/eventi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if ((await res.json()).success) {
        setEditingEventId(null);
        fetchEventi();
      }
    } catch (e) {
      setError("Errore modifica");
    } finally {
      setUpdatingEvent(false);
    }
  };

  const sendBroadcast = async () => {
    setSendingBroadcast(true);
    try {
      const res = await fetch("/api/eventi?section=broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evento_id: broadcastEventId, ...broadcastData }),
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastSuccess(
          `Email inviate con successo a ${data.destinatari_count} persone`,
        );
        setBroadcastEventId(null);
      }
    } catch (e) {
      setError("Errore invio mail");
    } finally {
      setSendingBroadcast(false);
    }
  };

  // --- RENDER HELPERS ---
  const getCounts = (id: number) => {
    const list = prenotazioni[id] || [];
    const prenotati = list.reduce(
      (acc, p) => acc + (p.num_partecipanti || 1),
      0,
    );
    const arrivati = list.reduce((acc, p) => acc + (p.num_arrivati || 0), 0);
    return { prenotati, arrivati };
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  if (loading && eventi.length === 0)
    return (
      <div className="eventi-loading">
        <RefreshCw className="spinner" /> Caricamento gestione eventi...
      </div>
    );

  return (
    <div className="eventi-container">
      <div className="eventi-header-section">
        <h1>Dashboard Eventi</h1>
        <div className="eventi-actions">
          <button
            onClick={() => setShowNewEventForm(!showNewEventForm)}
            className={`btn-icon ${showNewEventForm ? "btn-cancel" : "btn-create"}`}
          >
            {showNewEventForm ? <X size={20} /> : <Plus size={20} />}{" "}
            {showNewEventForm ? "Annulla" : "Nuovo Evento"}
          </button>
          <button onClick={() => fetchEventi()} className="btn-refresh">
            <RefreshCw size={18} /> Aggiorna
          </button>
        </div>
      </div>

      {error && (
        <div className="msg-alert error">
          <X
            size={14}
            onClick={() => setError(null)}
            style={{ cursor: "pointer" }}
          />{" "}
          {error}
        </div>
      )}
      {broadcastSuccess && (
        <div className="msg-alert success">
          <Check
            size={14}
            onClick={() => setBroadcastSuccess(null)}
            style={{ cursor: "pointer" }}
          />{" "}
          {broadcastSuccess}
        </div>
      )}

      {/* FORM NUOVO EVENTO */}
      {showNewEventForm && (
        <div className="admin-form-card">
          <h2>Crea Nuovo Evento</h2>
          <div className="form-grid">
            <div className="field">
              <label>Titolo *</label>
              <input
                type="text"
                value={nuovoEvento.titolo}
                onChange={(e) =>
                  setNuovoEvento({ ...nuovoEvento, titolo: e.target.value })
                }
              />
            </div>
            <div className="field">
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
              />
            </div>
            <div className="field">
              <label>Posti Max (0 = illimitati)</label>
              <input
                type="number"
                min="0"
                value={nuovoEvento.num_max}
                onChange={(e) =>
                  setNuovoEvento({
                    ...nuovoEvento,
                    num_max:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="field full">
              <label>Descrizione</label>
              <textarea
                value={nuovoEvento.descrizione}
                onChange={(e) =>
                  setNuovoEvento({
                    ...nuovoEvento,
                    descrizione: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
            <div className="field">
              <label>Locandina (File)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setNuovoEvento({
                    ...nuovoEvento,
                    immagine_file: e.target.files?.[0],
                  })
                }
              />
            </div>
          </div>
          <button
            onClick={submitNuovoEvento}
            disabled={creatingEvent}
            className="btn-submit-admin"
          >
            {creatingEvent ? "Creazione..." : "Pubblica Evento"}
          </button>
        </div>
      )}

      {/* MODALE BROADCAST */}
      {broadcastEventId && (
        <div className="overlay-modal">
          <div className="modal-content">
            <h3>Invia Comunicazione agli Iscritti</h3>
            <input
              type="text"
              placeholder="Oggetto Email"
              value={broadcastData.subject}
              onChange={(e) =>
                setBroadcastData({ ...broadcastData, subject: e.target.value })
              }
            />
            <textarea
              placeholder="Messaggio..."
              rows={5}
              value={broadcastData.message}
              onChange={(e) =>
                setBroadcastData({ ...broadcastData, message: e.target.value })
              }
            />
            <div className="modal-btns">
              <button
                onClick={sendBroadcast}
                disabled={sendingBroadcast}
                className="btn-primary"
              >
                {sendingBroadcast ? "Invio..." : "Invia ora"}
              </button>
              <button
                onClick={() => setBroadcastEventId(null)}
                className="btn-secondary"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTA EVENTI */}
      <div className="eventi-admin-grid">
        {eventi.map((evento) => {
          const { prenotati, arrivati } = getCounts(evento.id);
          const isExpanded = expandedEvents[evento.id];

          return (
            <div
              key={evento.id}
              className={`admin-event-card ${evento.visibile ? "is-online" : "is-draft"}`}
            >
              {/* Header della Card: cliccabile per espandere */}
              <div
                className="card-main"
                onClick={() =>
                  setExpandedEvents((prev) => ({
                    ...prev,
                    [evento.id]: !prev[evento.id],
                  }))
                }
              >
                <div className="event-preview-img">
                  <img
                    src={getImageUrl(evento)}
                    alt="Preview"
                    onError={(e) =>
                      (e.currentTarget.src = "/assets/placeholder.png")
                    }
                  />
                </div>
                <div className="event-summary">
                  <h3>{evento.titolo}</h3>
                  <div className="summary-meta">
                    <span>{formatDate(evento.data_evento)}</span>
                    <span className="badge-count">
                      {prenotati} iscritti{" "}
                      {evento.num_max ? `/ ${evento.num_max}` : ""}
                    </span>
                    <span
                      className={`status-dot ${evento.visibile ? "online" : "draft"}`}
                    >
                      {evento.visibile ? "Visibile" : "Bozza"}
                    </span>
                  </div>
                </div>
                <div className="card-ctrls">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVisibility(evento.id, evento.visibile);
                    }}
                    className="btn-vis"
                  >
                    {evento.visibile ? "Nascondi" : "Pubblica"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBroadcastEventId(evento.id);
                    }}
                    className="btn-mail"
                    title="Invia Email a tutti"
                  >
                    <Mail size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEventId(evento.id);
                      setEditData(evento);
                    }}
                    className="btn-edit"
                    title="Modifica Rapida"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEvento(evento.id);
                    }}
                    className="btn-trash"
                    title="Elimina Evento"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ChevronDown className={`arrow ${isExpanded ? "up" : ""}`} />
                </div>
              </div>

              {/* Dettagli Espansi: Mostra form di modifica OPPURE lista partecipanti */}
              {isExpanded && (
                <div className="card-details">
                  {editingEventId === evento.id ? (
                    <div className="mini-edit-form">
                      <h4>Modifica Rapida Evento</h4>
                      <div className="form-grid">
                        <div className="field">
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
                        <div className="field">
                          <label>Data</label>
                          <input
                            type="date"
                            value={
                              editData.data_evento
                                ? editData.data_evento.split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                data_evento: e.target.value,
                              })
                            }
                            disabled={updatingEvent}
                          />
                        </div>
                        <div className="field">
                          <label>Posti Max</label>
                          <input
                            type="number"
                            min="0"
                            value={editData.num_max || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                num_max: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              })
                            }
                            disabled={updatingEvent}
                          />
                        </div>
                        <div className="field full">
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
                            rows={3}
                          />
                        </div>
                        <div className="field">
                          <label>Cambia Locandina</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                immagine_file: e.target.files?.[0],
                              })
                            }
                            disabled={updatingEvent}
                          />
                        </div>
                      </div>
                      <div className="edit-btns">
                        <button
                          onClick={saveEdit}
                          className="btn-save-mini"
                          disabled={updatingEvent}
                        >
                          {updatingEvent ? "Salvataggio..." : "Salva Modifiche"}
                        </button>
                        <button
                          onClick={() => setEditingEventId(null)}
                          className="btn-cancel-mini"
                          disabled={updatingEvent}
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="participants-section">
                      <div className="section-header">
                        <h4>
                          Lista Partecipanti ({arrivati}/{prenotati} arrivati)
                        </h4>
                        <div className="search-box">
                          <Search size={16} />
                          <input
                            type="text"
                            placeholder="Filtra per nome o email..."
                            value={searchQuery[evento.id] || ""}
                            onChange={(e) =>
                              setSearchQuery({
                                ...searchQuery,
                                [evento.id]: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="attendees-table">
                        {prenotazioni[evento.id]
                          ?.filter((p) => {
                            const query = searchQuery[evento.id]?.toLowerCase();
                            return (
                              !query ||
                              `${p.nome} ${p.cognome} ${p.email}`
                                .toLowerCase()
                                .includes(query)
                            );
                          })
                          .map((p) => (
                            <div
                              key={p.id}
                              className={`attendee-row ${p.num_arrivati === (p.num_partecipanti || 1) ? "fully-checked" : ""}`}
                            >
                              <div className="att-info">
                                <span className="att-name">
                                  {p.nome} {p.cognome}
                                </span>
                                <span className="att-mail">{p.email}</span>
                              </div>
                              <div className="att-checkin">
                                <button
                                  onClick={() =>
                                    handleCheckin(
                                      p.id,
                                      evento.id,
                                      (p.num_arrivati || 0) - 1,
                                    )
                                  }
                                  disabled={(p.num_arrivati || 0) <= 0}
                                >
                                  -
                                </button>
                                <span className="att-num">
                                  {p.num_arrivati || 0} /{" "}
                                  {p.num_partecipanti || 1}
                                </span>
                                <button
                                  onClick={() =>
                                    handleCheckin(
                                      p.id,
                                      evento.id,
                                      (p.num_arrivati || 0) + 1,
                                    )
                                  }
                                  disabled={
                                    (p.num_arrivati || 0) >=
                                    (p.num_partecipanti || 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        {prenotazioni[evento.id]?.length === 0 && (
                          <p className="empty-msg">
                            Nessuno si è ancora prenotato a questo evento.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GestisciEventi;
