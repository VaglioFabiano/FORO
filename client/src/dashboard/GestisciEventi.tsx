import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Edit,
  Trash2,
  ChevronDown,
  Search,
  ExternalLink,
  Clock,
  Calendar,
} from "lucide-react";
import "../style/gestisciEventi.css";

interface Evento {
  id: number;
  titolo: string;
  descrizione: string;
  data_evento: string;
  orario?: string;
  link_esterno?: string;
  immagine_url?: string;
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
  num_biglietti?: number;
  num_partecipanti?: number;
  num_arrivati?: number;
  note?: string;
}

interface NuovoEvento {
  titolo: string;
  descrizione: string;
  data_evento: string;
  orario: string;
  link_esterno: string;
  immagine_url: string;
  immagine_file?: File;
  num_max: number | "";
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
  destinatari_count?: number;
}

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

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

  const [nuovoEvento, setNuovoEvento] = useState<NuovoEvento>({
    titolo: "",
    descrizione: "",
    data_evento: "",
    orario: "",
    link_esterno: "",
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
  const [broadcastData, setBroadcastData] = useState<BroadcastEmail>({
    subject: "",
    message: "",
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  const [userLevel, setUserLevel] = useState<number>(-1);
  const [userId, setUserId] = useState<number | null>(null);

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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const maxWidth = 800;
      const maxHeight = 800;
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
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
            reject(new Error("Errore compressione"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const uploadToImgBB = async (file: File): Promise<string> => {
    const compressedBase64 = await compressImage(file);
    const base64Data = compressedBase64.split(",")[1];
    const formData = new FormData();
    formData.append("image", base64Data);
    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      { method: "POST", body: formData },
    );
    const data = await response.json();
    if (data.success) return data.data.url;
    else throw new Error("Errore host immagini.");
  };

  const validateImageFile = (file: File): boolean => {
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      setError("File non supportato.");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File troppo grande (>10MB).");
      return false;
    }
    return true;
  };

  const fetchEventi = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
        setError(null);
      }
      const response = await fetch("/api/eventi");
      if (!response.ok) throw new Error("Errore caricamento eventi");
      const data: ApiResponse = await response.json();
      if (!data.success) throw new Error(data.error || "Errore sconosciuto");
      const fetchedEventi = data.eventi || [];
      setEventi(fetchedEventi);
      if (fetchedEventi.length > 0) {
        await Promise.all(
          fetchedEventi.map((evento) => fetchPrenotazioni(evento.id)),
        );
      }
    } catch (err) {
      console.error(err);
      if (!isBackground)
        setError(err instanceof Error ? err.message : "Errore connessione");
    } finally {
      if (!isBackground) setLoading(false);
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
      console.error(err);
    }
  }, []);

  useEffect(() => {
    setUserLevel(1);
    setUserId(1);
    fetchEventi(false);
  }, [fetchEventi]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchEventi(true);
    }, 7000);
    return () => clearInterval(interval);
  }, [fetchEventi]);

  const inviaEmailBroadcast = async () => {
    if (
      !broadcastEventId ||
      !broadcastData.subject.trim() ||
      !broadcastData.message.trim()
    )
      return setError("Oggetto e messaggio obbligatori.");
    if ((prenotazioni[broadcastEventId] || []).length === 0)
      return setError("Nessun partecipante.");
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
        setBroadcastSuccess(`Inviate ${data.destinatari_count} email!`);
        setBroadcastData({ subject: "", message: "" });
        setBroadcastEventId(null);
      } else throw new Error(data.error || "Errore invio.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore invio email.");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const creaEvento = async () => {
    if (!nuovoEvento.titolo.trim() || !nuovoEvento.data_evento.trim())
      return setError("Titolo e data obbligatori.");
    setCreatingEvent(true);
    setError(null);
    try {
      let finalImageUrl = nuovoEvento.immagine_url.trim();
      if (nuovoEvento.immagine_file) {
        if (!validateImageFile(nuovoEvento.immagine_file)) {
          setCreatingEvent(false);
          return;
        }
        finalImageUrl = await uploadToImgBB(nuovoEvento.immagine_file);
      }
      let eventData: any = {
        titolo: nuovoEvento.titolo.trim(),
        descrizione: nuovoEvento.descrizione.trim(),
        data_evento: nuovoEvento.data_evento.trim(),
        orario: nuovoEvento.orario.trim(),
        link_esterno: nuovoEvento.link_esterno.trim(),
        immagine_url: finalImageUrl,
        num_max: nuovoEvento.num_max !== "" ? Number(nuovoEvento.num_max) : 0,
        user_id: userId,
      };
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
          orario: "",
          link_esterno: "",
          immagine_url: "",
          num_max: "",
        });
        setShowNewEventForm(false);
        await fetchEventi(true);
      } else throw new Error(data.error || "Errore creazione.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore server.");
    } finally {
      setCreatingEvent(false);
    }
  };

  const aggiornaEvento = async () => {
    if (!editingEventId || !editData.titolo?.trim())
      return setError("Titolo obbligatorio.");
    setUpdatingEvent(true);
    setError(null);
    try {
      let finalImageUrl = editData.immagine_url?.trim() || "";
      if (editData.immagine_file) {
        if (!validateImageFile(editData.immagine_file)) {
          setUpdatingEvent(false);
          return;
        }
        finalImageUrl = await uploadToImgBB(editData.immagine_file);
      }
      let eventData: any = {
        id: editingEventId,
        titolo: editData.titolo.trim(),
        descrizione: editData.descrizione?.trim() || "",
        data_evento: editData.data_evento?.trim(),
        orario: editData.orario?.trim() || "",
        link_esterno: editData.link_esterno?.trim() || "",
        immagine_url: finalImageUrl,
        num_max: editData.num_max || 0,
        user_id: userId,
      };
      const response = await fetch("/api/eventi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      const data = await response.json();
      if (data.success) {
        setEditingEventId(null);
        setEditData({});
        await fetchEventi(true);
      } else throw new Error(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore aggiornamento.");
    } finally {
      setUpdatingEvent(false);
    }
  };

  const eliminaEvento = async (eventoId: number) => {
    if (!confirm("Eliminare evento e prenotazioni?")) return;
    setError(null);
    try {
      const response = await fetch("/api/eventi", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventoId, user_id: userId }),
      });
      const data = await response.json();
      if (data.success) await fetchEventi(true);
      else throw new Error(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore eliminazione.");
    }
  };

  const toggleVisibility = async (eventoId: number, currentVisible: number) => {
    try {
      const newStatus = currentVisible === 1 ? 0 : 1;
      const response = await fetch("/api/eventi?section=visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventoId, visibile: newStatus }),
      });
      const data = await response.json();
      if (data.success)
        setEventi(
          eventi.map((ev) =>
            ev.id === eventoId ? { ...ev, visibile: newStatus } : ev,
          ),
        );
      else throw new Error(data.error || "Errore aggiornamento.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore connessione.");
    }
  };

  const handleCheckin = async (
    prenotazioneId: number,
    eventoId: number,
    newArrivati: number,
  ) => {
    try {
      setPrenotazioni((prev) => ({
        ...prev,
        [eventoId]: prev[eventoId].map((p) =>
          p.id === prenotazioneId ? { ...p, num_arrivati: newArrivati } : p,
        ),
      }));
      const response = await fetch("/api/eventi?section=checkin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: prenotazioneId, num_arrivati: newArrivati }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Errore check-in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore connessione.");
    }
  };

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

  const getImageUrl = (evento: Evento) => evento.immagine_url || "";

  const iniziaModifica = (evento: Evento) => {
    setEditingEventId(evento.id);
    setEditData({
      titolo: evento.titolo,
      descrizione: evento.descrizione,
      data_evento: evento.data_evento.split("T")[0],
      orario: evento.orario || "",
      link_esterno: evento.link_esterno || "",
      immagine_url: evento.immagine_url || "",
      num_max: evento.num_max || 0,
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
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // LA FUNZIONE MANCANTE REINSERITA QUI
  const handleSearchChange = (eventoId: number, value: string) => {
    setSearchQuery((prev) => ({
      ...prev,
      [eventoId]: value.toLowerCase(),
    }));
  };

  const getParticipantCount = (eventoId: number) =>
    (prenotazioni[eventoId] || []).reduce(
      (acc, p) => acc + (p.num_biglietti || p.num_partecipanti || 1),
      0,
    );

  const getArrivatiCount = (eventoId: number) =>
    (prenotazioni[eventoId] || []).reduce(
      (acc, p) => acc + (p.num_arrivati || 0),
      0,
    );

  const canManageEvents = () => userLevel >= 0 && userLevel <= 2;

  const toggleEvent = (eventoId: number) =>
    setExpandedEvents((prev) => ({ ...prev, [eventoId]: !prev[eventoId] }));

  if (loading && eventi.length === 0)
    return (
      <div className="eventi-container">
        <div className="eventi-loading">
          <div className="loading-spinner"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    );

  return (
    <div className="eventi-container">
      <div className="eventi-header-section">
        <h1>Gestione Eventi</h1>
        <div className="eventi-actions">
          {canManageEvents() && (
            <button
              onClick={() => {
                setShowNewEventForm(!showNewEventForm);
                if (showNewEventForm) setError(null);
              }}
              className={`action-button ${showNewEventForm ? "cancel" : "create"}`}
            >
              {showNewEventForm ? "Chiudi" : "Nuovo Evento"}
            </button>
          )}
          <button
            onClick={() => fetchEventi(false)}
            className="refresh-button"
            disabled={loading}
          >
            Aggiorna
          </button>
        </div>
      </div>

      {error && (
        <div className="eventi-message error">
          <div className="message-icon">X</div>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-message">
            X
          </button>
        </div>
      )}
      {broadcastSuccess && (
        <div className="eventi-message success">
          <div className="message-icon">OK</div>
          <span>{broadcastSuccess}</span>
          <button
            onClick={() => setBroadcastSuccess(null)}
            className="close-message"
          >
            X
          </button>
        </div>
      )}

      {broadcastEventId && (
        <div className="broadcast-form">
          <div className="form-header">
            <h2>Invia Email</h2>
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
                  rows={4}
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
                {sendingBroadcast ? "Invio in corso..." : "Invia Email"}
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

      {showNewEventForm && canManageEvents() && (
        <div className="new-event-form">
          <div className="form-header">
            <h2>Nuovo Evento</h2>
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
              <div className="form-group">
                <label>Orario</label>
                <input
                  type="time"
                  value={nuovoEvento.orario}
                  onChange={(e) =>
                    setNuovoEvento({ ...nuovoEvento, orario: e.target.value })
                  }
                  disabled={creatingEvent}
                />
              </div>
              <div className="form-group">
                <label>Link Esterno (opzionale)</label>
                <input
                  type="url"
                  placeholder="https://linktr.ee/..."
                  value={nuovoEvento.link_esterno}
                  onChange={(e) =>
                    setNuovoEvento({
                      ...nuovoEvento,
                      link_esterno: e.target.value,
                    })
                  }
                  disabled={creatingEvent}
                />
              </div>
              <div className="form-group">
                <label>Posti Massimi</label>
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
                  disabled={creatingEvent}
                  placeholder="Vuoto per nessun limite"
                />
              </div>
              <div className="form-group">
                <label>Nuova Immagine (consigliato)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewEventImageChange}
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
            </div>
            <div className="form-actions">
              <button
                onClick={creaEvento}
                className="btn-create"
                disabled={creatingEvent}
              >
                {creatingEvent ? "Salvataggio..." : "Crea"}
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
                        <span>IMG</span>
                      </div>
                    )}
                  </div>
                  <div className="event-info">
                    <div className="event-title">
                      <h3>{evento.titolo}</h3>
                      <span className="participant-count">
                        {getParticipantCount(evento.id)} iscritti
                      </span>
                      <span
                        className={`visibility-badge ${evento.visibile === 1 ? "online" : "bozza"}`}
                      >
                        {evento.visibile === 1 ? "Online" : "Bozza"}
                      </span>
                    </div>
                    {/* UTILIZZO DELL'ICONA CLOCK QUI PER RISOLVERE L'ERRORE E MIGLIORARE LA UI */}
                    <div
                      className="event-date"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Calendar size={14} /> {formatDate(evento.data_evento)}
                      {evento.orario && (
                        <>
                          <span style={{ margin: "0 4px", opacity: 0.5 }}>
                            |
                          </span>
                          <Clock size={14} /> {evento.orario}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="event-actions">
                    {canManageEvents() && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVisibility(evento.id, evento.visibile);
                          }}
                          className={`btn-toggle-vis ${evento.visibile === 1 ? "online" : "bozza"}`}
                          title={
                            evento.visibile === 1 ? "Nascondi" : "Pubblica"
                          }
                        >
                          {evento.visibile === 1 ? "Nascondi" : "Pubblica"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            iniziaBroadcast(evento.id);
                          }}
                          className="btn-broadcast"
                          title="Invia Email"
                          disabled={broadcastEventId === evento.id}
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            iniziaModifica(evento);
                          }}
                          className="btn-edit"
                          title="Modifica"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminaEvento(evento.id);
                          }}
                          className="btn-delete"
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    <span
                      className={`expand-icon ${expandedEvents[evento.id] ? "expanded" : ""}`}
                    >
                      <ChevronDown size={18} />
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
                          <div className="form-group">
                            <label>Orario</label>
                            <input
                              type="time"
                              value={editData.orario || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  orario: e.target.value,
                                })
                              }
                              disabled={updatingEvent}
                            />
                          </div>
                          <div className="form-group">
                            <label>Link Esterno</label>
                            <input
                              type="url"
                              value={editData.link_esterno || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  link_esterno: e.target.value,
                                })
                              }
                              disabled={updatingEvent}
                            />
                          </div>
                          <div className="form-group">
                            <label>Posti Massimi</label>
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
                          <div className="form-group">
                            <label>Sostituisci Immagine</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditImageChange}
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
                          {evento.link_esterno && (
                            <a
                              href={evento.link_esterno}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                marginTop: "10px",
                                color: "#034a5a",
                                fontWeight: "bold",
                                textDecoration: "none",
                              }}
                            >
                              <ExternalLink size={16} /> Visita Link Esterno
                            </a>
                          )}
                        </div>

                        <div className="prenotazioni-section">
                          <div className="prenotazioni-header-stats">
                            <h4>Prenotazioni</h4>
                            <div className="stats-badges">
                              <span className="stat-totale">
                                Prenotati: {getParticipantCount(evento.id)}
                              </span>
                              <span className="stat-arrivati">
                                Arrivati: {getArrivatiCount(evento.id)}
                              </span>
                              {evento.num_max && evento.num_max > 0 ? (
                                <span className="stat-max">
                                  Max: {evento.num_max}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {(prenotazioni[evento.id] || []).length > 0 && (
                            <div
                              className="search-bar-container"
                              style={{ margin: "15px 0", position: "relative" }}
                            >
                              <Search
                                size={18}
                                style={{
                                  position: "absolute",
                                  left: "10px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  color: "#666",
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Cerca partecipante..."
                                value={searchQuery[evento.id] || ""}
                                onChange={(e) =>
                                  handleSearchChange(evento.id, e.target.value)
                                }
                                style={{
                                  width: "100%",
                                  padding: "10px 10px 10px 35px",
                                  borderRadius: "8px",
                                  border: "1px solid #ccc",
                                }}
                              />
                            </div>
                          )}
                          {(prenotazioni[evento.id] || []).length > 0 ? (
                            <div className="prenotazioni-list">
                              {prenotazioni[evento.id]
                                .filter((pren) => {
                                  const query = searchQuery[evento.id];
                                  if (!query) return true;
                                  const fullName =
                                    `${pren.nome} ${pren.cognome}`.toLowerCase();
                                  return fullName.includes(query);
                                })
                                .map((pren) => {
                                  const totaleBiglietti =
                                    pren.num_biglietti ||
                                    pren.num_partecipanti ||
                                    1;
                                  const arrivati = pren.num_arrivati || 0;
                                  const isCompleto =
                                    arrivati === totaleBiglietti;
                                  return (
                                    <div
                                      key={pren.id}
                                      className={`prenotazione-item ${isCompleto ? "checkin-completo" : ""}`}
                                    >
                                      <div className="prenotazione-info">
                                        <div className="partecipante-nome">
                                          {pren.nome} {pren.cognome}
                                        </div>
                                        <div className="partecipante-email">
                                          {pren.email}
                                        </div>
                                      </div>
                                      <div className="checkin-controller">
                                        <button
                                          className="checkin-btn minus"
                                          disabled={arrivati <= 0}
                                          onClick={() =>
                                            handleCheckin(
                                              pren.id,
                                              evento.id,
                                              arrivati - 1,
                                            )
                                          }
                                        >
                                          -
                                        </button>
                                        <div className="checkin-status">
                                          <span className="arrivati-num">
                                            {arrivati}
                                          </span>
                                          <span className="totale-num">
                                            / {totaleBiglietti}
                                          </span>
                                        </div>
                                        <button
                                          className="checkin-btn plus"
                                          disabled={arrivati >= totaleBiglietti}
                                          onClick={() =>
                                            handleCheckin(
                                              pren.id,
                                              evento.id,
                                              arrivati + 1,
                                            )
                                          }
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
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
