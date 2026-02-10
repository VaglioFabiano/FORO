import React, { useState, useEffect, useMemo } from "react";
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
  giorno_record?: {
    data: string;
    totale: number;
  };
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
  // Queste sono le fasce che vogliamo SEMPRE vedere, anche se vuote
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

  // --- LOGICA DINAMICA FASCE ---
  // Calcola tutte le fasce presenti nei dati attuali + quelle standard
  const dynamicFasce = useMemo(() => {
    const foundFasce = new Set(presenze.map((p) => p.fascia_oraria));
    // Aggiungi le standard per assicurarti che ci siano sempre
    fasceStandard.forEach((f) => foundFasce.add(f));

    // Converti in array
    const allFasce = Array.from(foundFasce);

    // Ordina: Prima le standard nell'ordine prefissato, poi le altre (extra) in ordine alfabetico/numerico
    return allFasce.sort((a, b) => {
      const idxA = fasceStandard.indexOf(a);
      const idxB = fasceStandard.indexOf(b);

      if (idxA !== -1 && idxB !== -1) return idxA - idxB; // Entrambe standard
      if (idxA !== -1) return -1; // A è standard, viene prima
      if (idxB !== -1) return 1; // B è standard, viene prima
      return a.localeCompare(b, undefined, { numeric: true }); // Entrambe extra, ordine naturale
    });
  }, [presenze]);

  // --- NUOVA LOGICA CALCOLO TOTALE (Adattiva) ---
  const calcolaTotaleGiorno = (dayPresenze: Presenza[]) => {
    // 1. Gestione logica specifica per le fasce standard
    const p9_13 =
      dayPresenze.find((p) => p.fascia_oraria === "9-13")?.numero_presenze || 0;
    const p13_16 =
      dayPresenze.find((p) => p.fascia_oraria === "13-16")?.numero_presenze ||
      0;
    const p16_19 =
      dayPresenze.find((p) => p.fascia_oraria === "16-19")?.numero_presenze ||
      0;
    const p21_24 =
      dayPresenze.find((p) => p.fascia_oraria === "21-24")?.numero_presenze ||
      0;

    // Regola del Max tra i pomeriggi
    const coreTotal = p9_13 + Math.max(p13_16, p16_19) + p21_24;

    // 2. Aggiungi QUALSIASI altra fascia non standard (es. "6.0", "Extra", etc.)
    const extraTotal = dayPresenze
      .filter((p) => !fasceStandard.includes(p.fascia_oraria))
      .reduce((acc, curr) => acc + (curr.numero_presenze || 0), 0);

    return coreTotal + extraTotal;
  };

  // --- EFFETTI ---
  useEffect(() => {
    fetchPresenze();
    getCurrentUser();
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
        setCurrentUser(JSON.parse(userData));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).getDate().toString();
  const getDayName = (dateString: string) =>
    giorni[new Date(dateString).getDay()];
  const isWeekend = (dateString: string) => {
    const day = new Date(dateString).getDay();
    return day === 0 || day === 6;
  };

  const canDownloadPdf = () =>
    currentUser && (currentUser.level === 0 || currentUser.level === 1);

  // --- API CALLS ---
  const fetchPresenze = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const targetDate = new Date(
        now.getFullYear(),
        now.getMonth() + currentMonthOffset,
        1,
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
        1,
      );
      const monthString = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;
      const response = await fetch(
        `/api/presenze?mese=${monthString}&stats=true`,
      );
      const data = await response.json();
      if (data.success) {
        const presenzeMap: Record<string, Presenza[]> = {};
        presenze.forEach((p) => {
          if (!presenzeMap[p.data]) presenzeMap[p.data] = [];
          presenzeMap[p.data].push(p);
        });
        let maxTotale = -1;
        let dataRecord = "";
        Object.keys(presenzeMap).forEach((d) => {
          const tot = calcolaTotaleGiorno(presenzeMap[d]);
          if (tot > maxTotale) {
            maxTotale = tot;
            dataRecord = d;
          }
        });
        setStatistiche({
          ...data.statistiche,
          giorno_record:
            maxTotale > 0 ? { data: dataRecord, totale: maxTotale } : undefined,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- GESTIONE CELLE E MODALE ---
  const getPresenza = (data: string, colonna: string): Presenza | undefined =>
    presenze.find((p) => p.data === data && p.fascia_oraria === colonna);

  const handleCellClick = (data: string, colonna: string) => {
    const presenza = getPresenza(data, colonna);
    setSelectedCell({ data, fascia: colonna });
    setEditValue(presenza?.numero_presenze.toString() || "0");
    setEditNote(presenza?.note || "");
    setIsModalOpen(true);
  };

  const handleSalvaPresenza = async () => {
    if (!selectedCell) return;

    const fasciaPulita = String(selectedCell.fascia).trim();

    try {
      const response = await fetch("/api/presenze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: selectedCell.data,
          fascia_oraria: fasciaPulita, // Invio stringa pulita
          numero_presenze: parseInt(editValue, 10) || 0,
          note: editNote,
          current_user_id: currentUser?.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchPresenze();
        closeModal();
      }
    } catch (error) {
      console.error(error);
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
        fetchPresenze();
        closeModal();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- PDF EXPORT (Adattato per colonne dinamiche) ---
  const handleDownloadPdf = async () => {
    if (selectedMonths.length === 0) return;
    try {
      setMessage({ type: "info", text: "Raccolta dati..." });

      // ORDINAMENTO CRONOLOGICO
      const sortedMonths = [...selectedMonths].sort((a, b) =>
        a.localeCompare(b),
      );

      const pdfData = [];
      for (const m of sortedMonths) {
        const [resP, resS] = await Promise.all([
          fetch(`/api/presenze?mese=${m}`),
          fetch(`/api/presenze?mese=${m}&stats=true`),
        ]);
        const dataP = await resP.json();
        const dataS = await resS.json();

        if (dataP.success) {
          // Calcola le fasce dinamiche per questo mese specifico
          const monthFasceSet = new Set<string>();
          fasceStandard.forEach((f) => monthFasceSet.add(f));
          dataP.presenze.forEach((p: any) =>
            monthFasceSet.add(p.fascia_oraria),
          );

          // Ordina
          const sortedMonthFasce = Array.from(monthFasceSet).sort((a, b) => {
            const idxA = fasceStandard.indexOf(a);
            const idxB = fasceStandard.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b, undefined, { numeric: true });
          });

          pdfData.push({
            monthInfo: dataP.month_info,
            presenze: dataP.presenze,
            stats: dataS.success ? dataS.statistiche : null,
            columns: sortedMonthFasce, // Passiamo le colonne rilevate per questo mese
          });
        }
      }

      setMessage({ type: "info", text: "Generazione PDF..." });
      await generateAndDownloadPdf(pdfData);
      setMessage({ type: "success", text: "PDF scaricato!" });
      closePdfModal();
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "Errore durante la creazione del PDF",
      });
    }
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
      const doc = new jsPDF("l"); // 'l' = Landscape (Orizzontale) per far stare più colonne
      const margin = 10;

      pdfData.forEach((monthData: any, monthIndex: number) => {
        if (monthIndex > 0) doc.addPage();

        let y = 20;
        doc.setFontSize(16);
        doc.text(
          `REPORT PRESENZE - ${monthData.monthInfo.monthName.toUpperCase()}`,
          148, // Centro A4 Landscape
          y,
          { align: "center" },
        );
        y += 15;

        const presenzeMap: Record<string, Presenza[]> = {};
        monthData.presenze.forEach((p: any) => {
          if (!presenzeMap[p.data]) presenzeMap[p.data] = [];
          presenzeMap[p.data].push(p);
        });

        // Configurazione Colonne Dinamica
        const columns = monthData.columns || fasceStandard;
        const colWidth = Math.min(25, 230 / (columns.length + 2)); // Adatta larghezza
        const dateWidth = 20;
        const dayWidth = 20;

        doc.setFontSize(8);

        // Header
        let x = margin;
        doc.text("Data", x, y);
        x += dateWidth;
        doc.text("Giorno", x, y);
        x += dayWidth;

        columns.forEach((colName: string) => {
          doc.text(colName, x, y);
          x += colWidth;
        });
        doc.text("Tot*", x, y);

        y += 4;
        doc.line(margin, y, 285, y); // Linea orizzontale più lunga per Landscape
        y += 6;

        let maxMonthTot = -1;
        let maxMonthData = "";

        monthData.monthInfo.dates.forEach((dStr: string) => {
          const dayRecords = presenzeMap[dStr] || [];
          // Usiamo la stessa logica di calcolo del componente
          const totalDay = calcolaTotaleGiorno(dayRecords);

          if (totalDay > maxMonthTot) {
            maxMonthTot = totalDay;
            maxMonthData = dStr;
          }

          // Stampa riga se > 0
          if (totalDay > 0) {
            if (y > 180) {
              // Limite pagina Landscape
              doc.addPage();
              y = 20;
            }

            x = margin;
            const dObj = new Date(dStr);
            doc.text(dObj.getDate().toString(), x, y);
            x += dateWidth;
            doc.text(giorni[dObj.getDay()], x, y);
            x += dayWidth;

            columns.forEach((colName: string) => {
              const val =
                dayRecords.find((r: any) => r.fascia_oraria === colName)
                  ?.numero_presenze || 0;
              doc.text(val > 0 ? val.toString() : "-", x, y);
              x += colWidth;
            });

            doc.setFont(undefined, "bold");
            doc.text(totalDay.toString(), x, y);
            doc.setFont(undefined, "normal");
            y += 5;
          }
        });

        // SEZIONE STATISTICHE COMPLETE NEL PDF
        y = Math.max(y + 10, 190);
        doc.line(margin, y, 285, y);
        y += 7;
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text(`STATISTICHE MENSILI`, margin, y);
        doc.setFont(undefined, "normal");
        y += 7;

        doc.setFontSize(9);
        doc.text(
          `Totale Mese: ${monthData.stats?.totale_mese || 0}`,
          margin,
          y,
        );
        doc.text(
          `Media Giornaliera: ${monthData.stats?.media_giornaliera || 0}`,
          margin + 60,
          y,
        );
        if (maxMonthTot > 0) {
          doc.text(
            `Record: ${maxMonthTot} (${new Date(maxMonthData).toLocaleDateString("it-IT")})`,
            margin + 120,
            y,
          );
        }
        y += 8;

        if (monthData.stats?.per_fascia) {
          doc.setFontSize(8);
          let statX = margin;
          monthData.stats.per_fascia.forEach((s: any) => {
            // Mostra stats solo per colonne effettivamente usate
            doc.text(
              `${s.fascia_oraria}: ${s.totale_presenze} (Max ${s.max_presenze})`,
              statX,
              y,
            );
            statX += 50;
            if (statX > 250) {
              // A capo se finisce spazio
              statX = margin;
              y += 5;
            }
          });
        }
      });

      doc.save(`report_presenze.pdf`);
      document.head.removeChild(script);
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Errore generazione PDF" });
    }
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
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key],
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
          {dynamicFasce.map((f) => (
            <div
              key={f}
              className={`fascia-header ${!fasceStandard.includes(f) ? "extra-fascia" : ""}`}
              title={
                !fasceStandard.includes(f)
                  ? "Fascia extra rilevata dai dati"
                  : ""
              }
            >
              {f}
            </div>
          ))}
          <div className="total-column">Tot</div>
        </div>
        <div className="calendar-body">
          {monthInfo.dates.map((data) => {
            const isWknd = isWeekend(data);
            const dayPresenze = presenzeMap[data] || [];
            const totaleDiario = calcolaTotaleGiorno(dayPresenze);

            return (
              <div
                key={data}
                className={`calendar-row ${isWknd ? "weekend" : ""}`}
              >
                <div className="date-cell">
                  <div className="day-number">{formatDate(data)}</div>
                  <div className="day-name">{getDayName(data)}</div>
                </div>
                {dynamicFasce.map((f) => {
                  const p = dayPresenze.find((p) => p.fascia_oraria === f);
                  return (
                    <div
                      key={`${data}-${f}`}
                      className={`presenza-cell ${p?.numero_presenze ? "has-presenze" : "empty"} ${isWknd ? "weekend" : ""} ${p?.is_history ? "is-history" : ""}`}
                      onClick={() => handleCellClick(data, f)}
                    >
                      <div className="numero-presenze">
                        {p?.numero_presenze || "-"}
                      </div>
                      {p?.note && <div className="presenza-note">📝</div>}
                    </div>
                  );
                })}
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
      list.push({ key: k, name: `${mesi[d.getMonth()]} ${d.getFullYear()}` });
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
            {statistiche.giorno_record && (
              <div className="stat-card highlight">
                <div className="stat-label">Giorno Record</div>
                <div className="stat-value">
                  {statistiche.giorno_record.totale}
                </div>
                <div className="stat-sub">
                  {new Date(statistiche.giorno_record.data).toLocaleDateString(
                    "it-IT",
                  )}
                </div>
              </div>
            )}
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
              <h3>
                {getPresenza(selectedCell.data, selectedCell.fascia)?.is_history
                  ? "🔒 Storico"
                  : "Modifica"}
              </h3>
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
                  disabled={
                    getPresenza(selectedCell.data, selectedCell.fascia)
                      ?.is_history
                  }
                />
              </div>
              <div className="form-group">
                <label>Note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  disabled={
                    getPresenza(selectedCell.data, selectedCell.fascia)
                      ?.is_history
                  }
                />
              </div>
            </div>
            <div className="presenza-modal-actions">
              <button className="cancel-button" onClick={closeModal}>
                Annulla
              </button>
              {!getPresenza(selectedCell.data, selectedCell.fascia)
                ?.is_history && (
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
