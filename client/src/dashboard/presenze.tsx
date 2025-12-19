import React, { useState, useEffect } from "react";
import "../style/presenze.css";

// Interfaccia coerente con la risposta JSON del backend
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
  is_history?: boolean; // Fondamentale per i dati storici
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
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [monthInfo, setMonthInfo] = useState<MonthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [currentMonthOffset, setCurrentMonthOffset] = useState<number>(0); // 0 = mese corrente
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

  // Fasce orarie standard per la visualizzazione a colonne
  const fasce = ["9-13", "13-16", "16-19", "21-24"];

  // Giorni per la visualizzazione UI
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

  useEffect(() => {
    fetchPresenze();
    getCurrentUser();
  }, [currentMonthOffset]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Gestione tastiera
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

  const getMonthNameFromOffset = (offset: number) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return targetDate.toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric",
    });
  };

  const navigateToMonth = (direction: "prev" | "next" | "current") => {
    if (direction === "prev") {
      setCurrentMonthOffset((prev) => prev - 1);
    } else if (direction === "next") {
      setCurrentMonthOffset((prev) => prev + 1);
    } else {
      setCurrentMonthOffset(0);
    }
  };

  const getCurrentUser = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      } catch (error) {
        console.error("Errore nel parsing user data:", error);
      }
    }
  };

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
        setMessage({
          type: "error",
          text: data.error || "Errore nel caricamento presenze",
        });
      }
    } catch (error) {
      console.error("Errore nel caricamento presenze:", error);
      setMessage({ type: "error", text: "Errore di connessione" });
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

      if (data.success) {
        setStatistiche(data.statistiche);
      }
    } catch (error) {
      console.error("Errore nel caricamento statistiche:", error);
    }
  };

  const getPresenzaByDataFascia = (
    data: string,
    fascia: string
  ): Presenza | undefined => {
    return presenze.find((p) => p.data === data && p.fascia_oraria === fascia);
  };

  const handleCellClick = (data: string, fascia: string) => {
    const presenza = getPresenzaByDataFascia(data, fascia);
    setSelectedCell({ data, fascia });
    setEditValue(presenza?.numero_presenze.toString() || "0");
    setEditNote(presenza?.note || "");
    setIsModalOpen(true);
  };

  const handleSalvaPresenza = async () => {
    if (!selectedCell) return;

    const numeroPresenze = parseInt(editValue) || 0;
    if (numeroPresenze < 0) {
      setMessage({
        type: "error",
        text: "Il numero di presenze non può essere negativo",
      });
      return;
    }

    try {
      const response = await fetch("/api/presenze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        setMessage({
          type: "success",
          text: "Presenza aggiornata con successo!",
        });
        fetchPresenze();
        closeModal();
      } else {
        setMessage({
          type: "error",
          text: data.error || "Errore nel salvataggio",
        });
      }
    } catch (error) {
      console.error("Errore nel salvataggio presenza:", error);
      setMessage({ type: "error", text: "Errore di connessione" });
    }
  };

  const handleEliminaPresenza = async () => {
    if (!selectedCell) return;

    try {
      const response = await fetch("/api/presenze", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: selectedCell.data,
          fascia_oraria: selectedCell.fascia,
          current_user_id: currentUser?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Presenza eliminata con successo!",
        });
        fetchPresenze();
        closeModal();
      } else {
        setMessage({
          type: "error",
          text: data.error || "Errore nell'eliminazione",
        });
      }
    } catch (error) {
      console.error("Errore nell'eliminazione presenza:", error);
      setMessage({ type: "error", text: "Errore di connessione" });
    }
  };

  // --- LOGICA PDF LATO CLIENT ---
  const handleDownloadPdf = async () => {
    if (selectedMonths.length === 0) {
      setMessage({ type: "error", text: "Seleziona almeno un mese" });
      return;
    }

    try {
      setMessage({ type: "info", text: "Raccolta dati in corso..." });
      const pdfData = await collectPdfData();

      if (pdfData.length === 0) {
        setMessage({
          type: "error",
          text: "Nessun dato trovato per i mesi selezionati",
        });
        return;
      }

      setMessage({ type: "info", text: "Generazione PDF in corso..." });
      await generateAndDownloadPdf(pdfData);

      setMessage({
        type: "success",
        text: `PDF scaricato con successo! Elaborati ${pdfData.length} mesi.`,
      });
      closePdfModal();
    } catch (error) {
      console.error("Errore nel download PDF:", error);
      setMessage({ type: "error", text: "Errore nella generazione del PDF" });
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
        console.error(`Errore nel recupero dati per ${monthString}:`, error);
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
      doc.setFont(undefined, "bold");
      doc.text("REPORT PRESENZE", 105, yPosition, { align: "center" });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(
        `Generato il: ${new Date().toLocaleDateString("it-IT")} alle ${new Date().toLocaleTimeString("it-IT")}`,
        105,
        yPosition,
        { align: "center" }
      );
      yPosition += 5;
      doc.text(`Periodo: ${pdfData.length} mesi selezionati`, 105, yPosition, {
        align: "center",
      });
      yPosition += 15;

      doc.line(margin, yPosition, 210 - margin, yPosition);
      yPosition += 10;

      pdfData.forEach((monthData, monthIndex) => {
        const { monthInfo, presenze } = monthData;

        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text(monthInfo.monthName.toUpperCase(), margin, yPosition);
        yPosition += 10;

        const presenzeMap: { [key: string]: { [fascia: string]: number } } = {};
        presenze.forEach((p: any) => {
          if (!presenzeMap[p.data]) {
            presenzeMap[p.data] = {};
          }
          presenzeMap[p.data][p.fascia_oraria] = p.numero_presenze;
        });

        doc.setFontSize(8);
        doc.setFont(undefined, "bold");

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
        let xPosition = margin;

        headers.forEach((header, i) => {
          doc.text(header, xPosition, yPosition);
          xPosition += colWidths[i];
        });
        yPosition += 5;

        doc.line(margin, yPosition, 210 - margin, yPosition);
        yPosition += 5;

        doc.setFont(undefined, "normal");
        let totaliFascia = { "9-13": 0, "13-16": 0, "16-19": 0, "21-24": 0 };
        let totaleMese = 0;
        let giorniConPresenze = 0;

        monthInfo.dates.forEach((data: string) => {
          const date = new Date(data);
          const dayOfWeek = date.getDay();
          const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

          const totaleGiorno = fasce.reduce((sum, fascia) => {
            return sum + (presenzeMap[data]?.[fascia] || 0);
          }, 0);

          if (totaleGiorno > 0) {
            if (yPosition > pageHeight - 15) {
              doc.addPage();
              yPosition = 20;
              doc.setFont(undefined, "bold");
              xPosition = margin;
              headers.forEach((header, i) => {
                doc.text(header, xPosition, yPosition);
                xPosition += colWidths[i];
              });
              yPosition += 5;
              doc.line(margin, yPosition, 210 - margin, yPosition);
              yPosition += 5;
              doc.setFont(undefined, "normal");
            }

            giorniConPresenze++;
            const giorno = date.getDate().toString();
            const nomeGiorno = dayNames[dayOfWeek];

            xPosition = margin;
            doc.text(giorno, xPosition, yPosition);
            xPosition += colWidths[0];

            doc.text(nomeGiorno, xPosition, yPosition);
            xPosition += colWidths[1];

            fasce.forEach((fascia, i) => {
              const numero = presenzeMap[data]?.[fascia] || 0;
              doc.text(
                numero > 0 ? numero.toString() : "-",
                xPosition,
                yPosition
              );
              totaliFascia[fascia as keyof typeof totaliFascia] += numero;
              totaleMese += numero;
              xPosition += colWidths[i + 2];
            });

            doc.text(totaleGiorno.toString(), xPosition, yPosition);
            yPosition += 4;
          }
        });

        yPosition += 2;
        doc.line(margin, yPosition, 210 - margin, yPosition);
        yPosition += 5;

        doc.setFont(undefined, "bold");
        xPosition = margin;
        doc.text("TOTALI", xPosition, yPosition);
        xPosition += colWidths[0] + colWidths[1];

        fasce.forEach((fascia, i) => {
          doc.text(
            totaliFascia[fascia as keyof typeof totaliFascia].toString(),
            xPosition,
            yPosition
          );
          xPosition += colWidths[i + 2];
        });
        doc.text(totaleMese.toString(), xPosition, yPosition);
        yPosition += 10;

        doc.setFont(undefined, "normal");
        doc.text(`Totale mese: ${totaleMese} presenze`, margin, yPosition);
        yPosition += 4;
        doc.text(
          `Media giornaliera: ${(totaleMese / monthInfo.dates.length).toFixed(2)} presenze/giorno`,
          margin,
          yPosition
        );
        yPosition += 4;
        doc.text(
          `Giorni con presenze: ${giorniConPresenze} su ${monthInfo.dates.length}`,
          margin,
          yPosition
        );
        yPosition += 15;

        if (monthIndex < pdfData.length - 1) {
          doc.line(margin, yPosition, 210 - margin, yPosition);
          yPosition += 10;
        }
      });

      doc.save(`presenze_report_${selectedMonths.length}_mesi.pdf`);
      document.head.removeChild(script);
    } catch (error) {
      console.error(
        "Errore nel caricamento di jsPDF o nella generazione:",
        error
      );
      setMessage({
        type: "info",
        text: "Generando report in formato testo...",
      });

      // FALLBACK TXT
      let content = "=".repeat(60) + "\n";
      content += "              REPORT PRESENZE\n";
      content += "=".repeat(60) + "\n";
      content += `Generato il: ${new Date().toLocaleDateString("it-IT")} alle ${new Date().toLocaleTimeString("it-IT")}\n`;
      content += `Periodo: ${pdfData.length} mesi selezionati\n\n`;

      pdfData.forEach((monthData, index) => {
        const { monthInfo, presenze } = monthData;

        content += "\n" + "-".repeat(50) + "\n";
        content += `MESE: ${monthInfo.monthName.toUpperCase()}\n`;
        content += "-".repeat(50) + "\n\n";

        // Organizza presenze per data
        const presenzeMap: { [key: string]: { [fascia: string]: number } } = {};
        presenze.forEach((p: any) => {
          if (!presenzeMap[p.data]) {
            presenzeMap[p.data] = {};
          }
          presenzeMap[p.data][p.fascia_oraria] = p.numero_presenze;
        });

        // Tabella giorni
        content += "DATA  | GG  | 9-13 | 13-16 | 16-19 | 21-24 | TOT\n";
        content += "------|-----|------|-------|-------|-------|----\n";

        let totaliFascia = { "9-13": 0, "13-16": 0, "16-19": 0, "21-24": 0 };
        let totaleMese = 0;
        let giorniConPresenze = 0;

        monthInfo.dates.forEach((data: string) => {
          const date = new Date(data);
          const dayOfWeek = date.getDay();
          const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

          const totaleGiorno = fasce.reduce((sum, fascia) => {
            return sum + (presenzeMap[data]?.[fascia] || 0);
          }, 0);

          if (totaleGiorno > 0) {
            giorniConPresenze++;
            const giorno = date.getDate().toString().padStart(2, " ");
            const nomeGiorno = dayNames[dayOfWeek];

            content += `${giorno}    | ${nomeGiorno} |`;

            fasce.forEach((fascia) => {
              const numero = presenzeMap[data]?.[fascia] || 0;
              content += ` ${numero.toString().padStart(4, " ")} |`;
              totaliFascia[fascia as keyof typeof totaliFascia] += numero;
              totaleMese += numero;
            });

            content += ` ${totaleGiorno.toString().padStart(3, " ")}\n`;
          }
        });

        // Totali
        content += "------|-----|------|-------|-------|-------|----\n";
        content += "TOT   |     |";
        fasce.forEach((fascia) => {
          content += ` ${totaliFascia[fascia as keyof typeof totaliFascia].toString().padStart(4, " ")} |`;
        });
        content += ` ${totaleMese.toString().padStart(3, " ")}\n\n`;

        // Statistiche
        content += "STATISTICHE:\n";
        content += `- Totale mese: ${totaleMese} presenze\n`;
        content += `- Media giornaliera: ${(totaleMese / monthInfo.dates.length).toFixed(2)} presenze/giorno\n`;
        content += `- Giorni con presenze: ${giorniConPresenze} su ${monthInfo.dates.length}\n`;

        if (index < pdfData.length - 1) {
          content += "\n\n";
        }
      });

      // Scarica come file di testo
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `presenze_report_${selectedMonths.length}_mesi.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

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

  const toggleMonthSelection = (monthKey: string) => {
    setSelectedMonths((prev) =>
      prev.includes(monthKey)
        ? prev.filter((m: string) => m !== monthKey)
        : [...prev, monthKey]
    );
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

  const toggleStats = () => {
    if (!showStats) {
      fetchStatistiche();
    }
    setShowStats(!showStats);
  };

  const canDownloadPdf = () => {
    return currentUser && (currentUser.level === 0 || currentUser.level === 1);
  };

  const renderCalendarGrid = () => {
    if (!monthInfo) return null;

    // Organizza le presenze in una mappa per accesso rapido
    // Nota: Un giorno può avere più record (es. diverse fasce orarie)
    const presenzeMap: { [key: string]: Presenza[] } = {};
    presenze.forEach((presenza) => {
      if (!presenzeMap[presenza.data]) {
        presenzeMap[presenza.data] = [];
      }
      presenzeMap[presenza.data].push(presenza);
    });

    return (
      <div className="presenze-calendar compact">
        <div className="calendar-header">
          <div className="date-column">Data</div>
          {fasce.map((fascia) => (
            <div key={fascia} className="fascia-header">
              {fascia}
            </div>
          ))}
          <div className="total-column">Tot</div>
        </div>

        <div className="calendar-body">
          {monthInfo.dates.map((data) => {
            // Recupera tutte le presenze per questo giorno
            const dailyPresenze = presenzeMap[data] || [];

            // Calcolo totale ROBUSTO: somma tutte le presenze del giorno,
            // indipendentemente dalla fascia oraria (anche "5.0" o "09:00 - 19:30")
            const totaleDiario = dailyPresenze.reduce(
              (sum, p) => sum + p.numero_presenze,
              0
            );

            return (
              <div
                key={data}
                className={`calendar-row ${isWeekend(data) ? "weekend" : ""}`}
              >
                <div className="date-cell">
                  <div className="day-number">{formatDate(data)}</div>
                  <div className="day-name">{getDayName(data)}</div>
                </div>

                {/* Cicla le colonne visualizzate (9-13, 13-16, etc.) */}
                {fasce.map((fascia) => {
                  const presenza = dailyPresenze.find(
                    (p) => p.fascia_oraria === fascia
                  );
                  const numero = presenza?.numero_presenze || 0;
                  const isHistory = presenza?.is_history;

                  return (
                    <div
                      key={`${data}-${fascia}`}
                      className={`presenza-cell ${numero > 0 ? "has-presenze" : "empty"} ${isWeekend(data) ? "weekend" : ""} ${isHistory ? "is-history" : ""}`}
                      onClick={() => handleCellClick(data, fascia)}
                    >
                      <div className="numero-presenze">
                        {numero > 0 ? numero : "-"}
                      </div>
                      {presenza?.note && (
                        <div className="presenza-note" title={presenza.note}>
                          📝
                        </div>
                      )}
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

  const renderStatistiche = () => {
    if (!statistiche) return null;

    return (
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
          <h4>Per Fascia Oraria</h4>
          {statistiche.per_fascia.map((stat) => (
            <div key={stat.fascia_oraria} className="fascia-stat">
              <div className="fascia-label">{stat.fascia_oraria}</div>
              <div className="fascia-values">
                <span>Totale: {stat.totale_presenze}</span>
                <span>
                  Media: {parseFloat(stat.media_presenze.toString()).toFixed(1)}
                </span>
                <span>Max: {stat.max_presenze}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPdfModal = () => {
    const months: Array<{ key: string; name: string }> = [];
    const currentDate = new Date();

    // Genera 24 mesi: 12 nel passato e 12 nel futuro rispetto al mese corrente
    for (let i = -12; i <= 12; i++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + i,
        1
      );
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = `${mesi[date.getMonth()]} ${date.getFullYear()}`;
      months.push({ key: monthKey, name: monthName });
    }

    return (
      <div className="presenza-modal-overlay" onClick={closePdfModal}>
        <div
          className="presenza-modal-content pdf-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="presenza-modal-header">
            <h3>📄 Scarica Report PDF</h3>
            <button className="close-button" onClick={closePdfModal}>
              ×
            </button>
          </div>

          <div className="presenza-modal-body">
            <p className="pdf-instructions">
              Seleziona i mesi di cui vuoi scaricare il report PDF:
            </p>

            <div className="months-grid">
              {months.map((month) => (
                <label key={month.key} className="month-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedMonths.includes(month.key)}
                    onChange={() => toggleMonthSelection(month.key)}
                  />
                  <span className="checkmark"></span>
                  {month.name}
                </label>
              ))}
            </div>

            <div className="selected-count">
              {selectedMonths.length > 0 && (
                <p>Selezionati: {selectedMonths.length} mesi</p>
              )}
            </div>
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
              📄 Scarica Report
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && presenze.length === 0) {
    return (
      <div className="presenze-container">
        <div className="presenze-loading">
          <div className="loading-spinner"></div>
          <p>Caricamento presenze...</p>
        </div>
      </div>
    );
  }

  // Helper per controllare se il record corrente è storico
  const currentCellIsHistory = selectedCell
    ? getPresenzaByDataFascia(selectedCell.data, selectedCell.fascia)
        ?.is_history
    : false;

  return (
    <div className="presenze-container">
      <div className="presenze-header-section">
        <h1>👥 Gestione Presenze</h1>

        <div className="month-selector">
          <button
            className="month-button"
            onClick={() => navigateToMonth("prev")}
            title="Mese precedente"
          >
            ← {getMonthNameFromOffset(currentMonthOffset - 1)}
          </button>
          <button
            className={`month-button ${currentMonthOffset === 0 ? "active" : ""}`}
            onClick={() => navigateToMonth("current")}
            title="Torna al mese corrente"
          >
            {getMonthNameFromOffset(currentMonthOffset)}
            {currentMonthOffset !== 0 && (
              <span className="month-offset-indicator">
                {currentMonthOffset > 0
                  ? `+${currentMonthOffset}`
                  : currentMonthOffset}
              </span>
            )}
          </button>
          <button
            className="month-button"
            onClick={() => navigateToMonth("next")}
            title="Mese successivo"
          >
            {getMonthNameFromOffset(currentMonthOffset + 1)} →
          </button>
        </div>

        <div className="presenze-actions">
          {canDownloadPdf() && (
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="pdf-button"
            >
              📄 Scarica PDF
            </button>
          )}
          <button onClick={toggleStats} className="stats-button">
            {showStats ? "📊 Nascondi Stats" : "📊 Mostra Stats"}
          </button>
          <button onClick={fetchPresenze} className="refresh-button">
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {message && (
        <div className={`presenze-message ${message.type}`}>
          <span className="message-icon">
            {message.type === "success"
              ? "✅"
              : message.type === "error"
                ? "❌"
                : "ℹ️"}
          </span>
          {message.text}
          <button className="close-message" onClick={() => setMessage(null)}>
            ×
          </button>
        </div>
      )}

      {showStats && renderStatistiche()}

      <div className="presenze-content">{renderCalendarGrid()}</div>

      {/* Modal Modifica */}
      {isModalOpen && selectedCell && (
        <div className="presenza-modal-overlay" onClick={closeModal}>
          <div
            className="presenza-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="presenza-modal-header">
              <h3>
                {currentCellIsHistory
                  ? "🔒 Dettaglio Storico"
                  : "Modifica Presenza"}
              </h3>
              <button className="close-button" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="presenza-modal-body">
              <div className="presenza-info">
                <p>
                  <strong>Data:</strong>{" "}
                  {new Date(selectedCell.data).toLocaleDateString("it-IT")}
                </p>
                <p>
                  <strong>Fascia oraria:</strong> {selectedCell.fascia}
                </p>
                <p>
                  <strong>Giorno:</strong> {getDayName(selectedCell.data)}
                </p>
                {currentCellIsHistory && (
                  <p className="history-badge">
                    ⚠️ Record di Archivio (Sola Lettura)
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="numero-presenze">Numero Presenze</label>
                <input
                  id="numero-presenze"
                  type="number"
                  min="0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Inserisci numero presenze"
                  disabled={currentCellIsHistory} // Disabilita se storico
                />
              </div>

              <div className="form-group">
                <label htmlFor="note-presenza">Note</label>
                <input
                  id="note-presenza"
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Note aggiuntive (opzionale)"
                  disabled={currentCellIsHistory} // Disabilita se storico
                />
              </div>
            </div>

            <div className="presenza-modal-actions">
              <button className="cancel-button" onClick={closeModal}>
                {currentCellIsHistory ? "Chiudi" : "Annulla"}
              </button>

              {!currentCellIsHistory && (
                <>
                  <button
                    className="delete-button"
                    onClick={handleEliminaPresenza}
                    disabled={
                      !getPresenzaByDataFascia(
                        selectedCell.data,
                        selectedCell.fascia
                      )?.esistente
                    }
                  >
                    🗑️ Elimina
                  </button>
                  <button className="save-button" onClick={handleSalvaPresenza}>
                    💾 Salva
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isPdfModalOpen && renderPdfModal()}
    </div>
  );
};

export default Presenze;
