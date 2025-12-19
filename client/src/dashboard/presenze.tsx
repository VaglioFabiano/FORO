import React, { useState, useEffect } from "react";
import "../style/presenze.css";

// --- INTERFACCE ---
interface Presenza {
  id: number | null;
  data: string;
  fascia_oraria: string;
  numero_presenze: number;
  note: string;
  user_id: number | null;
  user_name: string;
  user_surname: string;
  user_username: string;
  day_of_week: number;
  esistente: boolean;
  is_history?: boolean;
}

interface MonthInfo {
  dates: string[];
  monthName: string;
  year: number;
  month: number;
}

interface Message {
  type: "success" | "error" | "info";
  text: string;
}

interface User {
  id: number;
  name: string;
  surname: string;
  username: string;
  level: number;
}

interface Statistiche {
  per_fascia: Array<{
    fascia_oraria: string;
    totale_presenze: number;
    media_presenze: number;
    max_presenze: number;
    giorni_registrati: number;
  }>;
  totale_mese: number;
  media_giornaliera: string;
  month_info: MonthInfo;
}

const Presenze: React.FC = () => {
  // --- STATO ---
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [monthInfo, setMonthInfo] = useState<MonthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [currentMonthOffset, setCurrentMonthOffset] = useState<number>(0);
  const [selectedCell, setSelectedCell] = useState<{
    data: string;
    fascia: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editValue, setEditValue] = useState<string>("");
  const [editNote, setEditNote] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [statistiche, setStatistiche] = useState<Statistiche | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // --- CONFIGURAZIONE ---
  const fasceStandard = ["9-13", "13-16", "16-19", "21-24"];
  const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const mesi = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
  ];

  // --- EFFETTI ---
  useEffect(() => {
    fetchPresenze();
    getCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonthOffset]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        !isModalOpen &&
        !isPdfModalOpen &&
        event.target instanceof HTMLElement &&
        event.target.tagName !== "INPUT" &&
        event.target.tagName !== "TEXTAREA"
      ) {
        switch (event.key) {
          case "ArrowLeft":
            event.preventDefault();
            navigateToMonth("prev");
            break;
          case "ArrowRight":
            event.preventDefault();
            navigateToMonth("next");
            break;
          case "Home":
            event.preventDefault();
            navigateToMonth("current");
            break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isModalOpen, isPdfModalOpen]);

  // --- FUNZIONI DI UTILITÀ ---
  const getMonthNameFromOffset = (offset: number) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return targetDate.toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric",
    });
  };

  const navigateToMonth = (direction: "prev" | "next" | "current") => {
    if (direction === "prev") setCurrentMonthOffset((prev) => prev - 1);
    else if (direction === "next") setCurrentMonthOffset((prev) => prev + 1);
    else setCurrentMonthOffset(0);
  };

  const getCurrentUser = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      } catch (error) {
        console.error("Errore user data:", error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate().toString();
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return giorni[date.getDay()];
  };

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const canDownloadPdf = () => {
    return currentUser && (currentUser.level === 0 || currentUser.level === 1);
  };

  // --- API CALLS ---
  const fetchPresenze = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const targetDate = new Date(
        now.getFullYear(),
        now.getMonth() + currentMonthOffset,
        1
      );
      const monthString = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;

      const response = await fetch(`/api/presenze?mese=${monthString}`);
      const data = await response.json();

      if (data.success) {
        setPresenze(data.presenze);
        setMonthInfo(data.month_info);
      } else {
        setMessage({ type: "error", text: data.error || "Errore dati" });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Errore connessione" });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistiche = async () => {
    try {
      const now = new Date();
      const targetDate = new Date(
        now.getFullYear(),
        now.getMonth() + currentMonthOffset,
        1
      );
      const monthString = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;
      const response = await fetch(
        `/api/presenze?mese=${monthString}&stats=true`
      );
      const data = await response.json();
      if (data.success) setStatistiche(data.statistiche);
    } catch (error) {
      console.error(error);
    }
  };

  // --- GESTIONE CELLE E MODALE ---
  const getPresenza = (data: string, colonna: string): Presenza | undefined => {
    return presenze.find((p) => p.data === data && p.fascia_oraria === colonna);
  };

  const handleCellClick = (data: string, colonna: string) => {
    const presenza = getPresenza(data, colonna);
    setSelectedCell({ data, fascia: colonna });
    setEditValue(presenza?.numero_presenze.toString() || "0");
    setEditNote(presenza?.note || "");
    setIsModalOpen(true);
  };

  const handleSalvaPresenza = async () => {
    if (!selectedCell) return;
    const numeroPresenze = parseInt(editValue) || 0;
    if (numeroPresenze < 0) {
      setMessage({ type: "error", text: "Numero non valido" });
      return;
    }

    try {
      const response = await fetch("/api/presenze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: selectedCell.data,
          fascia_oraria: selectedCell.fascia,
          numero_presenze: numeroPresenze,
          note: editNote,
          current_user_id: currentUser?.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "Salvato!" });
        fetchPresenze();
        closeModal();
      } else {
        setMessage({ type: "error", text: data.error || "Errore salvataggio" });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Errore rete" });
    }
  };

  const handleEliminaPresenza = async () => {
    if (!selectedCell) return;
    try {
      const response = await fetch("/api/presenze", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: selectedCell.data,
          fascia_oraria: selectedCell.fascia,
          current_user_id: currentUser?.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "Eliminato!" });
        fetchPresenze();
        closeModal();
      } else {
        setMessage({
          type: "error",
          text: data.error || "Errore eliminazione",
        });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Errore rete" });
    }
  };

  // --- PDF EXPORT ---
  const handleDownloadPdf = async () => {
    if (selectedMonths.length === 0) {
      setMessage({ type: "error", text: "Seleziona un mese" });
      return;
    }
    try {
      setMessage({ type: "info", text: "Raccolta dati..." });
      const pdfData = await collectPdfData();
      if (pdfData.length === 0) {
        setMessage({ type: "error", text: "Nessun dato trovato" });
        return;
      }
      setMessage({ type: "info", text: "Generazione PDF..." });
      await generateAndDownloadPdf(pdfData);
      setMessage({ type: "success", text: "PDF scaricato!" });
      closePdfModal();
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Errore PDF" });
    }
  };

  const collectPdfData = async () => {
    const pdfData = [];
    for (const monthString of selectedMonths) {
      try {
        const response = await fetch(`/api/presenze?mese=${monthString}`);
        const data = await response.json();
        if (data.success) {
          pdfData.push({
            monthInfo: data.month_info,
            presenze: data.presenze.filter(
              (p: Presenza) => p.numero_presenze > 0
            ),
          });
        }
      } catch (error) {
        console.error(error);
      }
    }
    return pdfData;
  };

  const generateAndDownloadPdf = async (pdfData: any[]) => {
    try {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;

      doc.setFontSize(16);
      doc.text("REPORT PRESENZE", 105, yPosition, { align: "center" });
      yPosition += 15;

      pdfData.forEach((monthData: any, monthIndex: number) => {
        const { monthInfo, presenze } = monthData;
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text(monthInfo.monthName.toUpperCase(), margin, yPosition);
        yPosition += 10;

        const presenzeMap: Record<string, Record<string, number>> = {};
        presenze.forEach((p: any) => {
          if (!presenzeMap[p.data]) presenzeMap[p.data] = {};
          presenzeMap[p.data][p.fascia_oraria] = p.numero_presenze;
        });

        doc.setFontSize(8);
        const colWidths = [15, 15, 20, 20, 20, 20, 20];
        const headers = [
          "Data",
          "Giorno",
          "9-13",
          "13-16",
          "16-19",
          "21-24",
          "Tot",
        ];
        let xPos = margin;
        headers.forEach((h, i) => {
          doc.text(h, xPos, yPosition);
          xPos += colWidths[i];
        });
        yPosition += 5;
        doc.line(margin, yPosition, 210 - margin, yPosition);
        yPosition += 5;

        monthInfo.dates.forEach((data: string) => {
          const date = new Date(data);
          const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

          const dayRecords = presenze.filter((p: any) => p.data === data);
          const totalDay = dayRecords.reduce(
            (sum: number, p: any) => sum + p.numero_presenze,
            0
          );

          if (totalDay > 0) {
            if (yPosition > pageHeight - 15) {
              doc.addPage();
              yPosition = 20;
            }
            xPos = margin;
            doc.text(date.getDate().toString(), xPos, yPosition);
            xPos += colWidths[0];
            doc.text(dayNames[date.getDay()], xPos, yPosition);
            xPos += colWidths[1];

            fasceStandard.forEach((f, i) => {
              const num = presenzeMap[data]?.[f] || 0;
              doc.text(num > 0 ? num.toString() : "-", xPos, yPosition);
              xPos += colWidths[i + 2];
            });
            doc.text(totalDay.toString(), xPos, yPosition);
            yPosition += 4;
          }
        });

        yPosition += 5;
        doc.line(margin, yPosition, 210 - margin, yPosition);
        if (monthIndex < pdfData.length - 1) yPosition += 10;
      });

      doc.save(`presenze_report.pdf`);
      document.head.removeChild(script);
    } catch (e) {
      console.error(e);
      setMessage({ type: "info", text: "Errore PDF, fallback TXT..." });
      generateTxtFallback(pdfData);
    }
  };

  const generateTxtFallback = (pdfData: any[]) => {
    let content = "REPORT PRESENZE\n\n";
    pdfData.forEach((monthData: any) => {
      content += `MESE: ${monthData.monthInfo.monthName}\n`;
      monthData.presenze.forEach((p: any) => {
        content += `${p.data} | ${p.fascia_oraria}: ${p.numero_presenze}\n`;
      });
      content += "\n";
    });
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.txt";
    a.click();
  };

  // --- MODALI ---
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCell(null);
    setEditValue("");
    setEditNote("");
  };
  const closePdfModal = () => {
    setIsPdfModalOpen(false);
    setSelectedMonths([]);
  };
  const toggleMonthSelection = (key: string) => {
    setSelectedMonths((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };
  const toggleStats = () => {
    if (!showStats) fetchStatistiche();
    setShowStats(!showStats);
  };

  // --- RENDER COMPONENTI ---
  const renderCalendarGrid = () => {
    if (!monthInfo) return null;

    const presenzeMap: Record<string, Presenza[]> = {};
    presenze.forEach((p) => {
      if (!presenzeMap[p.data]) presenzeMap[p.data] = [];
      presenzeMap[p.data].push(p);
    });

    return (
      <div className="presenze-calendar compact">
        <div className="calendar-header">
          <div className="date-column">Data</div>
          {fasceStandard.map((f) => (
            <div key={f} className="fascia-header">
              {f}
            </div>
          ))}
          <div className="total-column">Tot</div>
        </div>
        <div className="calendar-body">
          {monthInfo.dates.map((data) => {
            const isWknd = isWeekend(data);
            const dayNum = formatDate(data);
            const dayName = getDayName(data);

            // Dati del giorno
            const dayPresenze = presenzeMap[data] || [];

            // CALCOLO TOTALE: Somma tutto ciò che è nel DB per oggi
            // Questo include anche le fasce che NON sono visualizzate nelle colonne
            const totaleDiario = dayPresenze.reduce(
              (sum, p) => sum + p.numero_presenze,
              0
            );

            return (
              <div
                key={data}
                className={`calendar-row ${isWknd ? "weekend" : ""}`}
              >
                <div className="date-cell">
                  <div className="day-number">{dayNum}</div>
                  <div className="day-name">{dayName}</div>
                </div>

                {/* Colonne Standard */}
                {fasceStandard.map((f) => {
                  const presenza = dayPresenze.find(
                    (p) => p.fascia_oraria === f
                  );
                  const numero = presenza?.numero_presenze || 0;
                  const isHistory = presenza?.is_history;
                  return (
                    <div
                      key={`${data}-${f}`}
                      className={`presenza-cell ${numero > 0 ? "has-presenze" : "empty"} ${isWknd ? "weekend" : ""} ${isHistory ? "is-history" : ""}`}
                      onClick={() => handleCellClick(data, f)}
                    >
                      <div className="numero-presenze">
                        {numero > 0 ? numero : "-"}
                      </div>
                      {presenza?.note && (
                        <div className="presenza-note">📝</div>
                      )}
                    </div>
                  );
                })}

                {/* Colonna Totale (Unica e Definitiva) */}
                <div
                  className={`total-cell ${totaleDiario > 0 ? "has-total" : ""}`}
                >
                  {totaleDiario > 0 ? totaleDiario : "-"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPdfModalContent = () => {
    const list = [];
    const now = new Date();
    for (let i = -12; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const n = `${mesi[d.getMonth()]} ${d.getFullYear()}`;
      list.push({ key: k, name: n });
    }
    return (
      <div className="months-grid">
        {list.map((m) => (
          <label key={m.key} className="month-checkbox">
            <input
              type="checkbox"
              checked={selectedMonths.includes(m.key)}
              onChange={() => toggleMonthSelection(m.key)}
            />
            <span className="checkmark"></span> {m.name}
          </label>
        ))}
      </div>
    );
  };

  if (loading && presenze.length === 0)
    return (
      <div className="presenze-container">
        <div className="presenze-loading">Caricamento...</div>
      </div>
    );

  const currentCellIsHistory = selectedCell
    ? getPresenza(selectedCell.data, selectedCell.fascia)?.is_history
    : false;

  return (
    <div className="presenze-container">
      <div className="presenze-header-section">
        <h1>👥 Gestione Presenze</h1>
        <div className="month-selector">
          <button
            className="month-button"
            onClick={() => navigateToMonth("prev")}
          >
            ←
          </button>
          <button
            className="month-button active"
            onClick={() => navigateToMonth("current")}
          >
            {getMonthNameFromOffset(currentMonthOffset)}
          </button>
          <button
            className="month-button"
            onClick={() => navigateToMonth("next")}
          >
            →
          </button>
        </div>
        <div className="presenze-actions">
          {canDownloadPdf() && (
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="pdf-button"
            >
              📄 PDF
            </button>
          )}
          <button onClick={toggleStats} className="stats-button">
            {showStats ? "Nascondi" : "Stats"}
          </button>
          <button onClick={fetchPresenze} className="refresh-button">
            🔄
          </button>
        </div>
      </div>

      {message && (
        <div className={`presenze-message ${message.type}`}>
          {message.text}
          <button className="close-message" onClick={() => setMessage(null)}>
            ×
          </button>
        </div>
      )}

      {showStats && statistiche && (
        <div className="statistiche-panel">
          <h3>📊 Statistiche {statistiche.month_info.monthName}</h3>
          <div className="stats-summary">
            <div className="stat-card">
              <div className="stat-label">Totale Mese</div>
              <div className="stat-value">{statistiche.totale_mese}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Media Giornaliera</div>
              <div className="stat-value">{statistiche.media_giornaliera}</div>
            </div>
          </div>
          <div className="stats-per-fascia">
            {statistiche.per_fascia.map((stat) => (
              <div key={stat.fascia_oraria} className="fascia-stat">
                <div className="fascia-label">{stat.fascia_oraria}</div>
                <div className="fascia-values">
                  <span>Tot: {stat.totale_presenze}</span>
                  <span>Max: {stat.max_presenze}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="presenze-content">{renderCalendarGrid()}</div>

      {isModalOpen && selectedCell && (
        <div className="presenza-modal-overlay" onClick={closeModal}>
          <div
            className="presenza-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="presenza-modal-header">
              <h3>{currentCellIsHistory ? "🔒 Storico" : "Modifica"}</h3>
              <button className="close-button" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="presenza-modal-body">
              <p>
                <strong>Data:</strong>{" "}
                {new Date(selectedCell.data).toLocaleDateString("it-IT")}
              </p>
              <p>
                <strong>Fascia:</strong> {selectedCell.fascia}
              </p>

              <div className="form-group">
                <label>Numero</label>
                <input
                  type="number"
                  min="0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  disabled={currentCellIsHistory}
                />
              </div>
              <div className="form-group">
                <label>Note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  disabled={currentCellIsHistory}
                />
              </div>
            </div>
            <div className="presenza-modal-actions">
              <button className="cancel-button" onClick={closeModal}>
                {currentCellIsHistory ? "Chiudi" : "Annulla"}
              </button>
              {!currentCellIsHistory && selectedCell.fascia && (
                <>
                  <button
                    className="delete-button"
                    onClick={handleEliminaPresenza}
                    disabled={
                      !getPresenza(selectedCell.data, selectedCell.fascia)
                        ?.esistente
                    }
                  >
                    Elimina
                  </button>
                  <button className="save-button" onClick={handleSalvaPresenza}>
                    Salva
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isPdfModalOpen && (
        <div className="presenza-modal-overlay" onClick={closePdfModal}>
          <div
            className="presenza-modal-content pdf-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="presenza-modal-header">
              <h3>Scarica PDF</h3>
              <button className="close-button" onClick={closePdfModal}>
                ×
              </button>
            </div>
            <div className="presenza-modal-body">
              <p>Seleziona mesi:</p>
              {renderPdfModalContent()}
            </div>
            <div className="presenza-modal-actions">
              <button className="cancel-button" onClick={closePdfModal}>
                Annulla
              </button>
              <button
                className="save-button"
                onClick={handleDownloadPdf}
                disabled={selectedMonths.length === 0}
              >
                Scarica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Presenze;
