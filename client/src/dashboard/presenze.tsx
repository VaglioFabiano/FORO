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

// Interfaccia unificata per le statistiche calcolate localmente
interface CalculatedStats {
  monthName: string;
  totale_mese: number;
  media_giornaliera: string;
  max_contemporanee: number;
  giorno_record: { data: string; totale: number } | null;
  per_fascia: Array<{
    fascia_oraria: string;
    totale_presenze: number;
    max_presenze: number;
  }>;
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

  // --- LOGICA DINAMICA FASCE ---
  const dynamicFasce = useMemo(() => {
    const foundFasce = new Set(presenze.map((p) => p.fascia_oraria));
    fasceStandard.forEach((f) => foundFasce.add(f));
    const allFasce = Array.from(foundFasce);
    return allFasce.sort((a, b) => {
      const idxA = fasceStandard.indexOf(a);
      const idxB = fasceStandard.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [presenze]);

  // --- HELPER CALCOLO TOTALE GIORNO ---
  const calcolaTotaleGiorno = (dayPresenze: Presenza[]) => {
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

    const coreTotal = p9_13 + Math.max(p13_16, p16_19) + p21_24;
    const extraTotal = dayPresenze
      .filter((p) => !fasceStandard.includes(p.fascia_oraria))
      .reduce((acc, curr) => acc + (curr.numero_presenze || 0), 0);

    return coreTotal + extraTotal;
  };

  // --- CALCOLO STATISTICHE ISTANTANEO (CLIENT SIDE) ---
  // Calcola tutto qui. Niente più chiamate server separate per le stats.
  const stats = useMemo<CalculatedStats | null>(() => {
    if (!monthInfo) return null;

    let totaleMese = 0;
    let maxContemporanee = 0;
    const presenzePerGiorno: Record<string, Presenza[]> = {};
    const statsFasce: Record<string, { tot: number; max: number }> = {};

    // 1. Itera su tutte le presenze singole
    presenze.forEach((p) => {
      // Totale grezzo (somma di tutto)
      totaleMese += p.numero_presenze;

      // Max contemporanee
      if (p.numero_presenze > maxContemporanee)
        maxContemporanee = p.numero_presenze;

      // Raggruppa per giorno
      if (!presenzePerGiorno[p.data]) presenzePerGiorno[p.data] = [];
      presenzePerGiorno[p.data].push(p);

      // Raggruppa per fascia
      if (!statsFasce[p.fascia_oraria])
        statsFasce[p.fascia_oraria] = { tot: 0, max: 0 };
      statsFasce[p.fascia_oraria].tot += p.numero_presenze;
      if (p.numero_presenze > statsFasce[p.fascia_oraria].max) {
        statsFasce[p.fascia_oraria].max = p.numero_presenze;
      }
    });

    // 2. Calcola totali giornalieri corretti (con regola del max pomeridiano)
    // Nota: Il 'totaleMese' sopra è la somma bruta. Spesso si vuole la somma dei totali giornalieri "calcolati".
    // Se preferisci la somma dei totali giornalieri con la regola, usiamo questo loop:
    let totaleRealeConRegole = 0;
    let giorniConPresenze = 0;
    let maxGiornoTot = 0;
    let maxGiornoData = "";

    monthInfo.dates.forEach((d) => {
      const dayP = presenzePerGiorno[d] || [];
      const dayTot = calcolaTotaleGiorno(dayP);

      if (dayTot > 0) {
        totaleRealeConRegole += dayTot;
        giorniConPresenze++;
        if (dayTot > maxGiornoTot) {
          maxGiornoTot = dayTot;
          maxGiornoData = d;
        }
      }
    });

    const media =
      giorniConPresenze > 0
        ? (totaleRealeConRegole / giorniConPresenze).toFixed(2)
        : "0.00";

    // 3. Formatta array fasce ordinato
    const fasceOrdinate = Object.keys(statsFasce)
      .map((f) => ({
        fascia_oraria: f,
        totale_presenze: statsFasce[f].tot,
        max_presenze: statsFasce[f].max,
      }))
      .sort((a, b) => {
        // Stesso ordinamento della griglia
        const idxA = fasceStandard.indexOf(a.fascia_oraria);
        const idxB = fasceStandard.indexOf(b.fascia_oraria);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.fascia_oraria.localeCompare(b.fascia_oraria, undefined, {
          numeric: true,
        });
      });

    return {
      monthName: monthInfo.monthName,
      totale_mese: totaleRealeConRegole, // O totaleMese se preferisci la somma pura senza regole
      media_giornaliera: media,
      max_contemporanee: maxContemporanee,
      giorno_record:
        maxGiornoTot > 0 ? { data: maxGiornoData, totale: maxGiornoTot } : null,
      per_fascia: fasceOrdinate,
    };
  }, [presenze, monthInfo]); // Ricalcola ogni volta che cambiano i dati o il mese

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

  // --- UTILITÀ ---
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

  // --- API ---
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

  // --- MODIFICA DATI ---
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
          fascia_oraria: fasciaPulita,
          numero_presenze: parseInt(editValue, 10) || 0,
          note: editNote,
          current_user_id: currentUser?.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchPresenze(); // Ricarica solo i dati grezzi, le stats si ricalcolano da sole
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

  // --- PDF ---
  const handleDownloadPdf = async () => {
    if (selectedMonths.length === 0) return;
    try {
      setMessage({ type: "info", text: "Raccolta dati..." });
      const sortedMonths = [...selectedMonths].sort((a, b) =>
        a.localeCompare(b),
      );
      const pdfData = [];

      for (const m of sortedMonths) {
        const resP = await fetch(`/api/presenze?mese=${m}`);
        const dataP = await resP.json();

        if (dataP.success) {
          // Logica identica a quella visuale per coerenza
          const monthFasceSet = new Set<string>();
          fasceStandard.forEach((f) => monthFasceSet.add(f));
          dataP.presenze.forEach((p: any) =>
            monthFasceSet.add(p.fascia_oraria),
          );

          const sortedMonthFasce = Array.from(monthFasceSet).sort((a, b) => {
            const idxA = fasceStandard.indexOf(a);
            const idxB = fasceStandard.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b, undefined, { numeric: true });
          });

          const calculatedStats = calculateStatsForPdf(
            dataP.presenze,
            sortedMonthFasce,
            dataP.month_info.dates,
          );

          pdfData.push({
            monthInfo: dataP.month_info,
            presenze: dataP.presenze,
            stats: calculatedStats,
            columns: sortedMonthFasce,
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

  const calculateStatsForPdf = (
    presenzeList: Presenza[],
    columns: string[],
    dates: string[],
  ) => {
    // Stessa logica di stats (useMemo) ma per il PDF
    const presenzeMap: Record<string, Presenza[]> = {};
    let maxContemporanee = 0;
    let totaleRealeConRegole = 0;
    let giorniConPresenze = 0;
    let maxGiornoTot = 0;
    let maxGiornoData = "";

    presenzeList.forEach((p) => {
      if (!presenzeMap[p.data]) presenzeMap[p.data] = [];
      presenzeMap[p.data].push(p);
      if (p.numero_presenze > maxContemporanee)
        maxContemporanee = p.numero_presenze;
    });

    dates.forEach((d) => {
      const dayPresenze = presenzeMap[d] || [];
      const dayTot = calcolaTotaleGiorno(dayPresenze);
      if (dayTot > 0) {
        totaleRealeConRegole += dayTot;
        giorniConPresenze++;
        if (dayTot > maxGiornoTot) {
          maxGiornoTot = dayTot;
          maxGiornoData = d;
        }
      }
    });

    const media =
      giorniConPresenze > 0
        ? (totaleRealeConRegole / giorniConPresenze).toFixed(2)
        : "0.00";

    const per_fascia = columns.map((col) => {
      const presenzeFascia = presenzeList.filter(
        (p) => p.fascia_oraria === col,
      );
      const totFascia = presenzeFascia.reduce(
        (acc, curr) => acc + curr.numero_presenze,
        0,
      );
      const maxFascia = presenzeFascia.reduce(
        (max, curr) => Math.max(max, curr.numero_presenze),
        0,
      );
      return {
        fascia_oraria: col,
        totale_presenze: totFascia,
        max_presenze: maxFascia,
      };
    });

    return {
      totale_mese: totaleRealeConRegole,
      media_giornaliera: media,
      max_contemporanee: maxContemporanee,
      giorno_record:
        maxGiornoTot > 0
          ? { data: maxGiornoData, totale: maxGiornoTot }
          : undefined,
      per_fascia: per_fascia,
    };
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
      const doc = new jsPDF("l");
      const margin = 10;

      pdfData.forEach((monthData: any, monthIndex: number) => {
        if (monthIndex > 0) doc.addPage();
        let y = 20;
        doc.setFontSize(16);
        doc.text(
          `REPORT PRESENZE - ${monthData.monthInfo.monthName.toUpperCase()}`,
          148,
          y,
          { align: "center" },
        );
        y += 15;

        const presenzeMap: Record<string, Presenza[]> = {};
        monthData.presenze.forEach((p: any) => {
          if (!presenzeMap[p.data]) presenzeMap[p.data] = [];
          presenzeMap[p.data].push(p);
        });

        const columns = monthData.columns || fasceStandard;
        const colWidth = Math.min(25, 230 / (columns.length + 2));
        const dateWidth = 20;
        const dayWidth = 20;

        doc.setFontSize(8);
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
        doc.line(margin, y, 285, y);
        y += 6;

        monthData.monthInfo.dates.forEach((dStr: string) => {
          const dayRecords = presenzeMap[dStr] || [];
          const totalDay = calcolaTotaleGiorno(dayRecords);
          if (totalDay > 0) {
            if (y > 180) {
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
          margin + 50,
          y,
        );
        doc.text(
          `Max Contemporanee: ${monthData.stats?.max_contemporanee || 0}`,
          margin + 100,
          y,
        );

        if (monthData.stats?.giorno_record) {
          doc.text(
            `Record Giorno: ${monthData.stats.giorno_record.totale} (${new Date(monthData.stats.giorno_record.data).toLocaleDateString("it-IT")})`,
            margin + 160,
            y,
          );
        }
        y += 8;

        if (monthData.stats?.per_fascia) {
          doc.setFontSize(8);
          let statX = margin;
          monthData.stats.per_fascia.forEach((s: any) => {
            doc.text(
              `${s.fascia_oraria}: ${s.totale_presenze} (Max ${s.max_presenze})`,
              statX,
              y,
            );
            statX += 50;
            if (statX > 250) {
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
    setShowStats(!showStats);
  };

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
          <button onClick={() => fetchPresenze()} className="refresh-button">
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

      {showStats && stats && (
        <div className="statistiche-panel">
          <h3>📊 Statistiche {stats.monthName}</h3>
          <div className="stats-summary">
            <div className="stat-card">
              <div className="stat-label">Totale Mese</div>
              <div className="stat-value">{stats.totale_mese}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Media Giornaliera</div>
              <div className="stat-value">{stats.media_giornaliera}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Max Contemporanee</div>
              <div className="stat-value">{stats.max_contemporanee}</div>
            </div>
            {stats.giorno_record && (
              <div className="stat-card highlight">
                <div className="stat-label">Giorno Record</div>
                <div className="stat-value">{stats.giorno_record.totale}</div>
                <div className="stat-sub">
                  {new Date(stats.giorno_record.data).toLocaleDateString(
                    "it-IT",
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="stats-per-fascia">
            {stats.per_fascia.map((stat) => (
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
