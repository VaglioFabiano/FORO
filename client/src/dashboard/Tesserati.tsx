import React, { useState, useEffect } from "react";
import "../style/tesserati.css";

interface Tesserato {
  id: number;
  nome: string;
  cognome: string;
  email: string;
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
        t.email.toLowerCase().includes(query)
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
        valueA = a.email.toLowerCase();
        valueB = b.email.toLowerCase();
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
      setEditingTesserato({ id: 0, nome: "", cognome: "", email: "" });
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
      !editingTesserato?.email?.trim() ||
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
              placeholder="Cerca per nome, cognome o email..."
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
                <td>{t.email}</td>
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
                  <label>Nome</label>
                  <input
                    type="text"
                    name="nome"
                    value={editingTesserato.nome}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="tesserati-form-group">
                  <label>Cognome</label>
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
                <div className="tesserati-form-group" style={{ width: "100%" }}>
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editingTesserato.email}
                    onChange={handleInputChange}
                    required
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
    </div>
  );
};

export default Tesserati;
