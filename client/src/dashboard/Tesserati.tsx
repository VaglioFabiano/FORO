import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../style/tesserati.css";

interface Tesserato {
  id: number;
  nome: string;
  cognome: string;
  email?: string;
  numero_di_telefono?: string;
  data_iscrizione: string;
}

interface Message {
  type: "success" | "error" | "info";
  text: string;
}

const Tesserati: React.FC = () => {
  const [tesserati, setTesserati] = useState<Tesserato[]>([]);
  const [filteredTesserati, setFilteredTesserati] = useState<Tesserato[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortOrder] = useState<"asc" | "desc">("asc");

  const [editingTesserato, setEditingTesserato] =
    useState<Partial<Tesserato> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [isDownloadModalOpen, setIsDownloadModalOpen] =
    useState<boolean>(false);
  const [downloadColumns, setDownloadColumns] = useState({
    id: true,
    nome: true,
    cognome: true,
    email: true,
    numero_di_telefono: true,
    data_iscrizione: true,
  });

  useEffect(() => {
    fetchTesserati();
  }, []);

  useEffect(() => {
    filterAndSortTesserati();
  }, [tesserati, sortBy, sortOrder, searchQuery]);

  const fetchTesserati = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user?entity=tesserato", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Errore nel caricamento tesserati");
      }

      setTesserati(data.tesserati);
    } catch (error) {
      console.error("Fetch tesserati error:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Errore di connessione",
      });
      setTesserati([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTesserati = () => {
    let filtered = tesserati.filter((t) => {
      if (searchQuery.trim() === "") return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        t.nome.toLowerCase().includes(query) ||
        t.cognome.toLowerCase().includes(query) ||
        (t.email && t.email.toLowerCase().includes(query)) ||
        (t.numero_di_telefono &&
          t.numero_di_telefono.toLowerCase().includes(query))
      );
    });

    filtered.sort((a, b) => {
      let valueA: string | number = a.id;
      let valueB: string | number = b.id;

      if (sortBy === "nome") {
        valueA = a.nome.toLowerCase();
        valueB = b.nome.toLowerCase();
      } else if (sortBy === "cognome") {
        valueA = a.cognome.toLowerCase();
        valueB = b.cognome.toLowerCase();
      } else if (sortBy === "email") {
        valueA = a.email ? a.email.toLowerCase() : "";
        valueB = b.email ? b.email.toLowerCase() : "";
      }

      if (sortOrder === "asc")
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
    });

    setFilteredTesserati(filtered);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const openModal = (tesserato?: Tesserato) => {
    if (tesserato) {
      setEditingTesserato({ ...tesserato });
    } else {
      setEditingTesserato({
        id: 0,
        nome: "",
        cognome: "",
        email: "",
        numero_di_telefono: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingTesserato(null);
    setIsModalOpen(false);
    setMessage(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingTesserato) return;
    const { name, value } = e.target;
    setEditingTesserato((prev) => ({ ...prev!, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!editingTesserato?.nome?.trim() || !editingTesserato?.cognome?.trim()) {
      setMessage({ type: "error", text: "Nome e cognome sono obbligatori" });
      return false;
    }

    if (
      editingTesserato.email?.trim() &&
      !/\S+@\S+\.\S+/.test(editingTesserato.email)
    ) {
      setMessage({ type: "error", text: "Email non valida" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !editingTesserato) return;

    setIsSubmitting(true);
    setMessage(null);

    const isNew = editingTesserato.id === 0;
    const method = isNew ? "POST" : "PUT";

    try {
      const payload = {
        entity: "tesserato",
        id: editingTesserato.id,
        nome: editingTesserato.nome,
        cognome: editingTesserato.cognome,
        email: editingTesserato.email,
        numero_di_telefono: editingTesserato.numero_di_telefono,
      };

      const response = await fetch("/api/user", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Errore durante il salvataggio");
      }

      setMessage({
        type: "success",
        text: `Tesserato ${isNew ? "creato" : "aggiornato"} con successo.`,
      });
      await fetchTesserati();
      closeModal();
    } catch (error) {
      console.error("Errore salvataggio:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Errore di connessione",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, fullName: string) => {
    if (
      !window.confirm(`Sei sicuro di voler eliminare il tesserato ${fullName}?`)
    )
      return;

    try {
      const response = await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "tesserato", id }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Errore durante l'eliminazione");
      }

      setMessage({
        type: "success",
        text: "Tesserato eliminato con successo.",
      });
      await fetchTesserati();
    } catch (error) {
      console.error("Errore eliminazione:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Errore di connessione",
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleDownloadToggleColumn = (column: keyof typeof downloadColumns) => {
    setDownloadColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const executeDownload = () => {
    const doc = new jsPDF();

    // Titolo del documento
    doc.text("Lista Tesserati", 14, 15);

    // Preparazione intestazioni colonna
    const head = [[] as string[]];
    if (downloadColumns.id) head[0].push("ID");
    if (downloadColumns.nome) head[0].push("Nome");
    if (downloadColumns.cognome) head[0].push("Cognome");
    if (downloadColumns.email) head[0].push("Email");
    if (downloadColumns.numero_di_telefono) head[0].push("Telefono");
    if (downloadColumns.data_iscrizione) head[0].push("Data Iscrizione");

    // Preparazione dei dati delle righe
    const body = filteredTesserati.map((t) => {
      const row = [];
      if (downloadColumns.id) row.push(t.id.toString());
      if (downloadColumns.nome) row.push(t.nome);
      if (downloadColumns.cognome) row.push(t.cognome);
      if (downloadColumns.email) row.push(t.email || "-");
      if (downloadColumns.numero_di_telefono)
        row.push(t.numero_di_telefono || "-");
      if (downloadColumns.data_iscrizione)
        row.push(formatDate(t.data_iscrizione));
      return row;
    });

    // Generazione della tabella
    autoTable(doc, {
      head: head,
      body: body,
      startY: 20,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] }, // Colore blu per l'intestazione
    });

    // Salvataggio del file
    doc.save("lista_tesserati.pdf");
    setIsDownloadModalOpen(false);
  };

  if (loading) {
    return (
      <div className="tesserati-container">
        <div className="tesserati-loading-container">
          <div className="tesserati-loading-spinner"></div>
          <p>Caricamento dati...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tesserati-container">
      <div className="tesserati-header">
        <h2>Gestione Tesserati</h2>
        <div className="tesserati-header-actions">
          <button onClick={fetchTesserati} className="tesserati-refresh-button">
            Aggiorna
          </button>
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="tesserati-refresh-button"
          >
            Scarica Lista
          </button>
          <button onClick={() => openModal()} className="tesserati-add-button">
            Nuovo Tesserato
          </button>
        </div>
      </div>

      {message && (
        <div className={`tesserati-message ${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="tesserati-filters">
        <div className="tesserati-filter-group">
          <label>Cerca</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Cerca per nome, cognome, email o telefono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tesserati-search-input"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="tesserati-clear-search"
                title="Cancella ricerca"
              >
                X
              </button>
            )}
          </div>
        </div>

        <div className="tesserati-filter-group">
          <label>Ordina per</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="tesserati-sort-select"
          >
            <option value="id">ID</option>
            <option value="nome">Nome</option>
            <option value="cognome">Cognome</option>
            <option value="email">Email</option>
          </select>
        </div>
      </div>

      <div className="tesserati-stats">
        <span>
          Trovati {filteredTesserati.length} tesserati su {tesserati.length}
        </span>
      </div>

      <div className="tesserati-table-container">
        <table className="tesserati-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Cognome</th>
              <th>Email</th>
              <th>Telefono</th>
              <th>Data Iscrizione</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredTesserati.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.nome}</td>
                <td>{t.cognome}</td>
                <td>{t.email || "-"}</td>
                <td>{t.numero_di_telefono || "-"}</td>
                <td>{formatDate(t.data_iscrizione)}</td>
                <td>
                  <div className="tesserati-actions">
                    <button
                      onClick={() => openModal(t)}
                      className="tesserati-edit-button"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(t.id, `${t.nome} ${t.cognome}`)
                      }
                      className="tesserati-delete-button"
                    >
                      Elimina
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTesserati.length === 0 && (
          <div className="tesserati-no-data">
            <p>Nessun tesserato corrisponde ai criteri di ricerca.</p>
          </div>
        )}
      </div>

      {isModalOpen && editingTesserato && (
        <div className="tesserati-modal-overlay" onClick={closeModal}>
          <div
            className="tesserati-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tesserati-modal-header">
              <h3>
                {editingTesserato.id === 0
                  ? "Nuovo Tesserato"
                  : "Modifica Tesserato"}
              </h3>
              <button onClick={closeModal} className="tesserati-close-button">
                X
              </button>
            </div>

            <form onSubmit={handleSubmit} className="tesserati-edit-form">
              <div className="tesserati-form-row">
                <div className="tesserati-form-group">
                  <label>Nome *</label>
                  <input
                    type="text"
                    name="nome"
                    value={editingTesserato.nome}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="tesserati-form-group">
                  <label>Cognome *</label>
                  <input
                    type="text"
                    name="cognome"
                    value={editingTesserato.cognome}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="tesserati-form-row">
                <div className="tesserati-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editingTesserato.email || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="tesserati-form-group">
                  <label>Telefono</label>
                  <input
                    type="text"
                    name="numero_di_telefono"
                    value={editingTesserato.numero_di_telefono || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="tesserati-modal-actions">
                <button
                  type="button"
                  onClick={closeModal}
                  className="tesserati-cancel-button"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="tesserati-submit-button"
                >
                  {isSubmitting ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDownloadModalOpen && (
        <div
          className="tesserati-modal-overlay"
          onClick={() => setIsDownloadModalOpen(false)}
        >
          <div
            className="tesserati-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "400px" }}
          >
            <div className="tesserati-modal-header">
              <h3>Scarica Lista Tesserati</h3>
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="tesserati-close-button"
              >
                X
              </button>
            </div>

            <div className="tesserati-edit-form" style={{ padding: "1rem 0" }}>
              <p style={{ marginBottom: "1rem" }}>
                Seleziona i dati da includere nel file PDF:
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={downloadColumns.id}
                    onChange={() => handleDownloadToggleColumn("id")}
                  />
                  ID
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={downloadColumns.nome}
                    onChange={() => handleDownloadToggleColumn("nome")}
                  />
                  Nome
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={downloadColumns.cognome}
                    onChange={() => handleDownloadToggleColumn("cognome")}
                  />
                  Cognome
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={downloadColumns.email}
                    onChange={() => handleDownloadToggleColumn("email")}
                  />
                  Email
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={downloadColumns.numero_di_telefono}
                    onChange={() =>
                      handleDownloadToggleColumn("numero_di_telefono")
                    }
                  />
                  Telefono
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={downloadColumns.data_iscrizione}
                    onChange={() =>
                      handleDownloadToggleColumn("data_iscrizione")
                    }
                  />
                  Data Iscrizione
                </label>
              </div>

              <div
                className="tesserati-modal-actions"
                style={{ marginTop: "1.5rem" }}
              >
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="tesserati-cancel-button"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={executeDownload}
                  className="tesserati-submit-button"
                  disabled={!Object.values(downloadColumns).some(Boolean)}
                >
                  Scarica PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tesserati;
