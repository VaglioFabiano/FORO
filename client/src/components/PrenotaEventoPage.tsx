import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  MapPin,
  Mail,
  User,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Download,
  Clock,
  ExternalLink,
} from "lucide-react";
import "../style/componentiEventi.css";
import informativaPdf from "../assets/Informativa_privacy.pdf";

interface Evento {
  id: number;
  titolo: string;
  descrizione: string;
  data_evento: string;
  orario?: string;
  link_esterno?: string;
  immagine_url?: string;
  immagine_blob?: string;
  immagine_tipo?: string;
  immagine_nome?: string;
  num_max?: number;
}

interface PrenotazioneForm {
  nome: string;
  cognome: string;
  email: string;
  num_biglietti: number;
  note?: string;
  privacy: boolean;
}

interface Props {
  eventoId?: number;
}

const PrenotaEventoPage: React.FC<Props> = ({ eventoId }) => {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [postiDisponibili, setPostiDisponibili] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const queryId = new URLSearchParams(window.location.search).get("id");
  const activeId = eventoId || (queryId ? parseInt(queryId) : null);

  const [formData, setFormData] = useState<PrenotazioneForm>({
    nome: "",
    cognome: "",
    email: "",
    num_biglietti: 1,
    note: "",
    privacy: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeId) {
      fetchEvento(activeId);
    } else {
      setLoading(false);
      setError("Nessun evento selezionato. Impossibile procedere.");
    }
  }, [activeId]);

  const fetchEvento = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/eventi?action=single&id=${id}`);
      if (!response.ok) throw new Error("Errore di rete");

      const data = await response.json();
      if (data.success && data.evento) {
        setEvento(data.evento);

        if (data.evento.num_max && data.evento.num_max > 0) {
          const prenotati =
            data.prenotazioni?.reduce(
              (acc: number, curr: any) => acc + (curr.num_partecipanti || 1),
              0,
            ) || 0;
          setPostiDisponibili(Math.max(0, data.evento.num_max - prenotati));
        } else {
          setPostiDisponibili(null);
        }
      } else {
        throw new Error("Evento non trovato");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (ev: Evento) => {
    if (
      typeof ev.immagine_blob === "string" &&
      ev.immagine_blob.startsWith("data:image")
    ) {
      return ev.immagine_blob;
    }
    if (ev.immagine_url) return ev.immagine_url;
    return `/api/eventi?action=image&id=${ev.id}`;
  };

  // Funzione per correggere i link inseriti senza http://
  const getValidUrl = (url?: string) => {
    if (!url) return "";
    return url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
  };

  const maxTickets =
    postiDisponibili !== null ? Math.min(10, postiDisponibili) : 10;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.nome.trim()) errors.nome = "Il nome è obbligatorio";
    if (!formData.cognome.trim()) errors.cognome = "Il cognome è obbligatorio";
    if (
      !formData.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    )
      errors.email = "Inserisci un'email valida";
    if (!formData.privacy)
      errors.privacy =
        "Devi accettare l'informativa sulla privacy per procedere";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : name === "num_biglietti"
            ? parseInt(value) || 1
            : value,
    }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/eventi?section=prenotazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento_id: activeId,
          nome: formData.nome,
          cognome: formData.cognome,
          email: formData.email,
          num_biglietti: formData.num_biglietti,
          note: formData.note,
          data_prenotazione: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
      } else {
        throw new Error(data.error || "Errore nella prenotazione");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore durante la prenotazione",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToHome = () => {
    if ((window as any).navigateToHome) (window as any).navigateToHome();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("it-IT", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return "Data non valida";
    }
  };

  if (loading) {
    return (
      <div className="prenota-wrapper" style={{ paddingTop: "80px" }}>
        <div className="status-card">
          <div className="loading-spinner"></div>
          <p>Caricamento evento...</p>
        </div>
      </div>
    );
  }

  if (error && !evento) {
    return (
      <div className="prenota-wrapper" style={{ paddingTop: "80px" }}>
        <div className="status-card error-card">
          <AlertCircle size={48} className="error-icon" />
          <h2>Qualcosa è andato storto</h2>
          <p>{error}</p>
          <button onClick={handleBackToHome} className="btn-secondary">
            <ArrowLeft size={16} /> Torna alla home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="prenota-wrapper" style={{ paddingTop: "80px" }}>
        <div className="status-card success-card">
          <CheckCircle size={64} className="success-icon" />
          <h2>Prenotazione confermata!</h2>
          <p>
            La tua prenotazione per{" "}
            <strong>
              {formData.num_biglietti}{" "}
              {formData.num_biglietti === 1 ? "persona" : "persone"}
            </strong>{" "}
            all'evento "<strong>{evento?.titolo}</strong>" è stata registrata
            con successo.
          </p>
          <div className="success-notice">
            <Mail size={24} />
            <p>
              Dovrebbe arrivarti una mail di conferma all'indirizzo{" "}
              <strong>{formData.email}</strong>. Ricorda di mostrare questa mail
              all'ingresso dell'evento.
              <br />
              <br />
              <strong>Nota bene:</strong> Se la mail non dovesse arrivare, non
              preoccuparti, la tua prenotazione è comunque confermata!
            </p>
          </div>
          <div className="success-actions">
            <button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  ...formData,
                  num_biglietti: 1,
                  note: "",
                  privacy: false,
                });
                fetchEvento(activeId as number);
              }}
              className="btn-primary"
            >
              Prenota per un'altra persona
            </button>
            <button onClick={handleBackToHome} className="btn-secondary">
              Torna alla home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="prenota-wrapper" style={{ paddingTop: "80px" }}>
      {evento && (
        <div className="evento-layout">
          <div className="evento-media">
            <img
              src={getImageUrl(evento)}
              alt={`Locandina di ${evento.titolo}`}
              className="evento-poster"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <div className="evento-content-form">
            <div className="evento-info-box">
              <h2>{evento.titolo}</h2>

              <div className="evento-badges">
                <span className="badge">
                  <Calendar size={16} /> {formatDate(evento.data_evento)}
                </span>

                {evento.orario && (
                  <span className="badge">
                    <Clock size={16} /> {evento.orario}
                  </span>
                )}

                <span className="badge">
                  <MapPin size={16} /> Aula Studio Foro - Piossasco
                </span>

                {postiDisponibili !== null && (
                  <span
                    className="badge"
                    style={
                      postiDisponibili === 0
                        ? {
                            color: "#e74c3c",
                            backgroundColor: "rgba(231, 76, 60, 0.1)",
                          }
                        : {}
                    }
                  >
                    <Users size={16} />{" "}
                    {postiDisponibili === 0
                      ? "Posti esauriti"
                      : `${postiDisponibili} posti rimasti`}
                  </span>
                )}
              </div>

              {/* Descrizione con il link esterno alla fine */}
              <div
                className="evento-desc-container"
                style={{ marginBottom: "40px" }}
              >
                <p
                  className="evento-desc"
                  style={{
                    whiteSpace: "pre-line",
                    marginBottom: evento.link_esterno ? "16px" : "0",
                  }}
                >
                  {evento.descrizione ||
                    "Evento organizzato dall'Associazione Foro."}
                </p>

                {evento.link_esterno && (
                  <a
                    href={getValidUrl(evento.link_esterno)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#034a5a",
                      fontWeight: "700",
                      textDecoration: "none",
                      fontSize: "1.1rem",
                      padding: "8px 16px",
                      backgroundColor: "rgba(3, 74, 90, 0.1)",
                      borderRadius: "8px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "rgba(3, 74, 90, 0.2)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "rgba(3, 74, 90, 0.1)")
                    }
                  >
                    <ExternalLink size={18} /> Per approfondire
                  </a>
                )}
              </div>
            </div>

            {postiDisponibili === 0 ? (
              <div
                className="form-box"
                style={{ textAlign: "center", padding: "40px" }}
              >
                <AlertCircle
                  size={48}
                  color="#e74c3c"
                  style={{ marginBottom: "16px" }}
                />
                <h3 style={{ borderBottom: "none", marginBottom: "16px" }}>
                  Evento al Completo
                </h3>
                <p style={{ color: "#555", fontSize: "1.1rem" }}>
                  Ci dispiace, ma questo evento ha raggiunto il numero massimo
                  di partecipanti e non è più possibile prenotarsi.
                </p>
              </div>
            ) : (
              <div className="form-box">
                <h3>I tuoi dati</h3>
                {error && <div className="form-alert">{error}</div>}
                <div className="form-grid">
                  <div className="input-group">
                    <label htmlFor="nome">Nome *</label>
                    <div className="input-wrapper">
                      <User size={18} />
                      <input
                        type="text"
                        id="nome"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        disabled={submitting}
                        className={formErrors.nome ? "has-error" : ""}
                        placeholder="Mario"
                      />
                    </div>
                    {formErrors.nome && (
                      <span className="error-text">{formErrors.nome}</span>
                    )}
                  </div>
                  <div className="input-group">
                    <label htmlFor="cognome">Cognome *</label>
                    <div className="input-wrapper">
                      <User size={18} />
                      <input
                        type="text"
                        id="cognome"
                        name="cognome"
                        value={formData.cognome}
                        onChange={handleInputChange}
                        disabled={submitting}
                        className={formErrors.cognome ? "has-error" : ""}
                        placeholder="Rossi"
                      />
                    </div>
                    {formErrors.cognome && (
                      <span className="error-text">{formErrors.cognome}</span>
                    )}
                  </div>
                  <div className="input-group full-width">
                    <label htmlFor="email">Email *</label>
                    <div className="input-wrapper">
                      <Mail size={18} />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={submitting}
                        className={formErrors.email ? "has-error" : ""}
                        placeholder="mario.rossi@email.com"
                      />
                    </div>
                    {formErrors.email && (
                      <span className="error-text">{formErrors.email}</span>
                    )}
                  </div>
                  <div className="input-group full-width">
                    <label htmlFor="num_biglietti">Numero di biglietti *</label>
                    <div className="input-wrapper">
                      <Users size={18} />
                      <select
                        id="num_biglietti"
                        name="num_biglietti"
                        value={
                          formData.num_biglietti > maxTickets
                            ? maxTickets
                            : formData.num_biglietti
                        }
                        onChange={handleInputChange}
                        disabled={submitting}
                      >
                        {Array.from(
                          { length: maxTickets },
                          (_, i) => i + 1,
                        ).map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? "biglietto" : "biglietti"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="input-group full-width">
                    <label htmlFor="note">Note aggiuntive (opzionale)</label>
                    <textarea
                      id="note"
                      name="note"
                      value={formData.note}
                      onChange={handleInputChange}
                      disabled={submitting}
                      rows={3}
                      placeholder="Eventuali richieste speciali..."
                    ></textarea>
                  </div>
                  <div className="input-group full-width privacy-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="privacy"
                        checked={formData.privacy}
                        onChange={handleInputChange}
                        disabled={submitting}
                      />
                      <span>
                        Ho letto e accetto l'
                        <a
                          href={informativaPdf}
                          download="Informativa_privacy.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="privacy-link"
                        >
                          Informativa sulla Privacy <Download size={14} />
                        </a>
                        *
                      </span>
                    </label>
                    {formErrors.privacy && (
                      <span className="error-text">{formErrors.privacy}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-submit"
                >
                  {submitting ? (
                    <>
                      <span className="spinner"></span> Elaborazione...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} /> Conferma Prenotazione
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrenotaEventoPage;
