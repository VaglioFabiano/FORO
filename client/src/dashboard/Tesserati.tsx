import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { UserOptions } from "jspdf-autotable";
import "../style/tesserati.css";

// --- INTERFACCE ---
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

// Estensione del tipo jsPDF per includere il plugin autoTable
interface jsPDFWithPlugin extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

const Tesserati: React.FC = () => {
  // --- STATO ---
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

  // --- EFFETTI ---
  useEffect(() => {
    fetchTesserati();
  }, []);

  useEffect(() => {
    filterAndSortTesserati();
  }, [tesserati, sortBy, sortOrder, searchQuery]);

  // --- API ---
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

  // --- LOGICA FILTRI E ORDINAMENTO ---
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

  // --- FUNZIONE STAMPA PDF ---
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF() as jsPDFWithPlugin;
      const today = new Date().toLocaleDateString("it-IT");

      // Intestazione
      doc.setFontSize(18);
      doc.text("Elenco tesserati FORO", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Documento generato il: ${today}`, 14, 28);
      doc.text(`Totale record: ${filteredTesserati.length}`, 14, 33);

      // Preparazione dati tabella
      const tableRows = filteredTesserati.map((t) => [
        t.id,
        t.nome,
        t.cognome,
        t.email || "-",
        t.numero_di_telefono || "-",
        formatDate(t.data_iscrizione),
      ]);

      // Generazione tabella
      doc.autoTable({
        startY: 40,
        head: [
          ["ID", "Nome", "Cognome", "Email", "Telefono", "Data Iscrizione"],
        ],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 15 },
          5: { cellWidth: 35 },
        },
      });

      doc.save("Elenco_tesserati_FORO.pdf");
      setMessage({ type: "success", text: "PDF generato con successo" });
    } catch (error) {
      console.error("Errore generazione PDF:", error);
      setMessage({
        type: "error",
        text: "Errore durante la creazione del PDF",
      });
    }
  };

  // --- GESTIONE MODALE E FORM ---
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

  if (loading && tesserati.length === 0) {
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
            onClick={handleDownloadPdf}
            className="tesserati-download-button"
          >
            Scarica PDF
          </button>
          <button onClick={() => openModal()} className="tesserati-add-button">
            Nuovo Tesserato
          </button>
        </div>
      </div>

      {message && (
        <div className={`tesserati-message ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="close-message">
            ×
          </button>
        </div>
      )}

      <div className="tesserati-filters">
        <div className="tesserati-filter-group">
          <label>Cerca</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Cerca per nome, cognome, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tesserati-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="tesserati-clear-search"
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
            <p>Nessun tesserato trovato.</p>
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
                ×
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
    </div>
  );
};

export default Tesserati;
