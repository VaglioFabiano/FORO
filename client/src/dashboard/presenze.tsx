import React, { useState, useEffect } from 'react';
import '../style/presenze.css';

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
}

interface MonthInfo {
  dates: string[];
  monthName: string;
  year: number;
  month: number;
}

interface Message {
  type: 'success' | 'error' | 'info';
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

type MeseType = 'precedente' | 'corrente' | 'successivo';

const Presenze: React.FC = () => {
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [monthInfo, setMonthInfo] = useState<MonthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [selectedMese, setSelectedMese] = useState<MeseType>('corrente');
  const [selectedCell, setSelectedCell] = useState<{data: string, fascia: string} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [statistiche, setStatistiche] = useState<Statistiche | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const fasce = ['9-13', '13-16', '16-19', '21-24'];
  const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const mesi = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  useEffect(() => {
    fetchPresenze();
    getCurrentUser();
  }, [selectedMese]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      } catch (error) {
        console.error('Errore nel parsing user data:', error);
      }
    }
  };

  const fetchPresenze = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/presenze?mese=${selectedMese}`);
      const data = await response.json();
      
      if (data.success) {
        setPresenze(data.presenze);
        setMonthInfo(data.month_info);
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore nel caricamento presenze' });
      }
    } catch (error) {
      console.error('Errore nel caricamento presenze:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistiche = async () => {
    try {
      const response = await fetch(`/api/presenze?mese=${selectedMese}&stats=true`);
      const data = await response.json();
      
      if (data.success) {
        setStatistiche(data.statistiche);
      }
    } catch (error) {
      console.error('Errore nel caricamento statistiche:', error);
    }
  };

  const handleCellClick = (data: string, fascia: string) => {
    const presenza = getPresenzaByDataFascia(data, fascia);
    setSelectedCell({ data, fascia });
    setEditValue(presenza?.numero_presenze.toString() || '0');
    setEditNote(presenza?.note || '');
    setIsModalOpen(true);
  };

  const getPresenzaByDataFascia = (data: string, fascia: string): Presenza | undefined => {
    return presenze.find(p => p.data === data && p.fascia_oraria === fascia);
  };

  const handleSalvaPresenza = async () => {
    if (!selectedCell) return;

    const numeroPresenze = parseInt(editValue) || 0;
    if (numeroPresenze < 0) {
      setMessage({ type: 'error', text: 'Il numero di presenze non può essere negativo' });
      return;
    }

    try {
      const response = await fetch('/api/presenze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: selectedCell.data,
          fascia_oraria: selectedCell.fascia,
          numero_presenze: numeroPresenze,
          note: editNote,
          current_user_id: currentUser?.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Presenza aggiornata con successo!' });
        fetchPresenze();
        closeModal();
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore nel salvataggio' });
      }
    } catch (error) {
      console.error('Errore nel salvataggio presenza:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    }
  };

  const handleEliminaPresenza = async () => {
    if (!selectedCell) return;

    try {
      const response = await fetch('/api/presenze', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: selectedCell.data,
          fascia_oraria: selectedCell.fascia,
          current_user_id: currentUser?.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Presenza eliminata con successo!' });
        fetchPresenze();
        closeModal();
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore nell\'eliminazione' });
      }
    } catch (error) {
      console.error('Errore nell\'eliminazione presenza:', error);
      setMessage({ type: 'error', text: 'Errore di connessione' });
    }
  };

  const handleDownloadPdf = async () => {
    if (selectedMonths.length === 0) {
      setMessage({ type: 'error', text: 'Seleziona almeno un mese' });
      return;
    }

    try {
      setMessage({ type: 'info', text: 'Raccolta dati in corso...' });
      
      // Raccogli i dati direttamente dal frontend invece di usare il backend
      const pdfData = await collectPdfData();
      
      if (pdfData.length === 0) {
        setMessage({ type: 'error', text: 'Nessun dato trovato per i mesi selezionati' });
        return;
      }

      setMessage({ type: 'info', text: 'Generazione PDF in corso...' });
      
      // Genera e scarica il PDF
      await generateAndDownloadPdf(pdfData);
      
      setMessage({ 
        type: 'success', 
        text: `PDF scaricato con successo! Elaborati ${pdfData.length} mesi.` 
      });
      closePdfModal();

    } catch (error) {
      console.error('Errore nel download PDF:', error);
      setMessage({ 
        type: 'error', 
        text: 'Errore nella generazione del PDF' 
      });
    }
  };

  // Raccoglie i dati per il PDF
  const collectPdfData = async () => {
    const pdfData = [];
    
    for (const monthString of selectedMonths) {
      try {
        const response = await fetch(`/api/presenze?mese=${monthString}`);
        const data = await response.json();
        
        if (data.success) {
          pdfData.push({
            monthInfo: data.month_info,
            presenze: data.presenze.filter((p: Presenza) => p.numero_presenze > 0)
          });
        }
      } catch (error) {
        console.error(`Errore nel recupero dati per ${monthString}:`, error);
      }
    }
    
    return pdfData;
  };

  // Genera e scarica il PDF usando jsPDF
  const generateAndDownloadPdf = async (pdfData: any[]) => {
    try {
      // Carica jsPDF dinamicamente
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      // Ora jsPDF è disponibile globalmente
      const { jsPDF } = (window as any).jspdf;
      
      const doc = new jsPDF();
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      
      // Header del documento
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('REPORT PRESENZE', 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`, 105, yPosition, { align: 'center' });
      yPosition += 5;
      doc.text(`Periodo: ${pdfData.length} mesi selezionati`, 105, yPosition, { align: 'center' });
      yPosition += 15;

      // Aggiungi linea separatrice
      doc.line(margin, yPosition, 210 - margin, yPosition);
      yPosition += 10;

      pdfData.forEach((monthData, monthIndex) => {
        const { monthInfo, presenze } = monthData;
        
        // Controlla se serve una nuova pagina
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Titolo del mese
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(monthInfo.monthName.toUpperCase(), margin, yPosition);
        yPosition += 10;
        
        // Organizza presenze per data
        const presenzeMap: { [key: string]: { [fascia: string]: number } } = {};
        presenze.forEach((p: any) => {
          if (!presenzeMap[p.data]) {
            presenzeMap[p.data] = {};
          }
          presenzeMap[p.data][p.fascia_oraria] = p.numero_presenze;
        });

        // Header della tabella
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        
        const colWidths = [15, 15, 20, 20, 20, 20, 20];
        const headers = ['Data', 'Giorno', '9-13', '13-16', '16-19', '21-24', 'Tot'];
        let xPosition = margin;
        
        headers.forEach((header, i) => {
          doc.text(header, xPosition, yPosition);
          xPosition += colWidths[i];
        });
        yPosition += 5;
        
        // Linea sotto l'header
        doc.line(margin, yPosition, 210 - margin, yPosition);
        yPosition += 5;

        // Dati delle presenze
        doc.setFont(undefined, 'normal');
        let totaliFascia = { '9-13': 0, '13-16': 0, '16-19': 0, '21-24': 0 };
        let totaleMese = 0;
        let giorniConPresenze = 0;

        monthInfo.dates.forEach((data: string) => {
          const date = new Date(data);
          const dayOfWeek = date.getDay();
          const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
          
          const totaleGiorno = fasce.reduce((sum, fascia) => {
            return sum + (presenzeMap[data]?.[fascia] || 0);
          }, 0);

          if (totaleGiorno > 0) {
            // Controlla se serve una nuova pagina
            if (yPosition > pageHeight - 15) {
              doc.addPage();
              yPosition = 20;
              
              // Ripeti l'header sulla nuova pagina
              doc.setFont(undefined, 'bold');
              xPosition = margin;
              headers.forEach((header, i) => {
                doc.text(header, xPosition, yPosition);
                xPosition += colWidths[i];
              });
              yPosition += 5;
              doc.line(margin, yPosition, 210 - margin, yPosition);
              yPosition += 5;
              doc.setFont(undefined, 'normal');
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
              doc.text(numero > 0 ? numero.toString() : '-', xPosition, yPosition);
              totaliFascia[fascia as keyof typeof totaliFascia] += numero;
              totaleMese += numero;
              xPosition += colWidths[i + 2];
            });
            
            doc.text(totaleGiorno.toString(), xPosition, yPosition);
            yPosition += 4;
          }
        });

        // Linea prima dei totali
        yPosition += 2;
        doc.line(margin, yPosition, 210 - margin, yPosition);
        yPosition += 5;

        // Riga dei totali
        doc.setFont(undefined, 'bold');
        xPosition = margin;
        doc.text('TOTALI', xPosition, yPosition);
        xPosition += colWidths[0] + colWidths[1];
        
        fasce.forEach((fascia, i) => {
          doc.text(totaliFascia[fascia as keyof typeof totaliFascia].toString(), xPosition, yPosition);
          xPosition += colWidths[i + 2];
        });
        doc.text(totaleMese.toString(), xPosition, yPosition);
        yPosition += 10;

        // Statistiche
        doc.setFont(undefined, 'normal');
        doc.text(`Totale mese: ${totaleMese} presenze`, margin, yPosition);
        yPosition += 4;
        doc.text(`Media giornaliera: ${(totaleMese / monthInfo.dates.length).toFixed(2)} presenze/giorno`, margin, yPosition);
        yPosition += 4;
        doc.text(`Giorni con presenze: ${giorniConPresenze} su ${monthInfo.dates.length}`, margin, yPosition);
        yPosition += 15;

        // Separatore tra mesi (se non è l'ultimo)
        if (monthIndex < pdfData.length - 1) {
          doc.line(margin, yPosition, 210 - margin, yPosition);
          yPosition += 10;
        }
      });

      // Salva il PDF
      doc.save(`presenze_report_${selectedMonths.length}_mesi.pdf`);
      
      // Rimuovi lo script dopo l'uso
      document.head.removeChild(script);
      
    } catch (error) {
      console.error('Errore nel caricamento di jsPDF:', error);
      
      // Fallback: scarica come testo se jsPDF non funziona
      setMessage({ type: 'info', text: 'Generando report in formato testo...' });
      
      let content = '='.repeat(60) + '\n';
      content += '              REPORT PRESENZE\n';
      content += '='.repeat(60) + '\n';
      content += `Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}\n`;
      content += `Periodo: ${pdfData.length} mesi selezionati\n\n`;

      pdfData.forEach((monthData, index) => {
        const { monthInfo, presenze } = monthData;
        
        content += '\n' + '-'.repeat(50) + '\n';
        content += `MESE: ${monthInfo.monthName.toUpperCase()}\n`;
        content += '-'.repeat(50) + '\n\n';
        
        // Organizza presenze per data
        const presenzeMap: { [key: string]: { [fascia: string]: number } } = {};
        presenze.forEach((p: any) => {
          if (!presenzeMap[p.data]) {
            presenzeMap[p.data] = {};
          }
          presenzeMap[p.data][p.fascia_oraria] = p.numero_presenze;
        });

        // Tabella giorni
        content += 'DATA  | GG  | 9-13 | 13-16 | 16-19 | 21-24 | TOT\n';
        content += '------|-----|------|-------|-------|-------|----\n';
        
        let totaliFascia = { '9-13': 0, '13-16': 0, '16-19': 0, '21-24': 0 };
        let totaleMese = 0;
        let giorniConPresenze = 0;

        monthInfo.dates.forEach((data: string) => {
          const date = new Date(data);
          const dayOfWeek = date.getDay();
          const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
          
          const totaleGiorno = fasce.reduce((sum, fascia) => {
            return sum + (presenzeMap[data]?.[fascia] || 0);
          }, 0);

          if (totaleGiorno > 0) {
            giorniConPresenze++;
            const giorno = date.getDate().toString().padStart(2, ' ');
            const nomeGiorno = dayNames[dayOfWeek];
            
            content += `${giorno}    | ${nomeGiorno} |`;
            
            fasce.forEach(fascia => {
              const numero = presenzeMap[data]?.[fascia] || 0;
              content += ` ${numero.toString().padStart(4, ' ')} |`;
              totaliFascia[fascia as keyof typeof totaliFascia] += numero;
              totaleMese += numero;
            });
            
            content += ` ${totaleGiorno.toString().padStart(3, ' ')}\n`;
          }
        });

        // Totali
        content += '------|-----|------|-------|-------|-------|----\n';
        content += 'TOT   |     |';
        fasce.forEach(fascia => {
          content += ` ${totaliFascia[fascia as keyof typeof totaliFascia].toString().padStart(4, ' ')} |`;
        });
        content += ` ${totaleMese.toString().padStart(3, ' ')}\n\n`;

        // Statistiche
        content += 'STATISTICHE:\n';
        content += `- Totale mese: ${totaleMese} presenze\n`;
        content += `- Media giornaliera: ${(totaleMese / monthInfo.dates.length).toFixed(2)} presenze/giorno\n`;
        content += `- Giorni con presenze: ${giorniConPresenze} su ${monthInfo.dates.length}\n`;
        
        if (index < pdfData.length - 1) {
          content += '\n\n';
        }
      });

      // Scarica come file di testo
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
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
    setEditValue('');
    setEditNote('');
  };

  const closePdfModal = () => {
    setIsPdfModalOpen(false);
    setSelectedMonths([]);
  };

  const toggleMonthSelection = (monthKey: string) => {
    setSelectedMonths(prev => 
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
    return day === 0 || day === 6; // Domenica o Sabato
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

    // Organizza presenze per data e fascia
    const presenzeMap: { [key: string]: { [fascia: string]: Presenza } } = {};
    presenze.forEach(presenza => {
      if (!presenzeMap[presenza.data]) {
        presenzeMap[presenza.data] = {};
      }
      presenzeMap[presenza.data][presenza.fascia_oraria] = presenza;
    });

    return (
      <div className="presenze-calendar compact">
        {/* Header con fasce orarie */}
        <div className="calendar-header">
          <div className="date-column">Data</div>
          {fasce.map(fascia => (
            <div key={fascia} className="fascia-header">
              {fascia}
            </div>
          ))}
          <div className="total-column">Tot</div>
        </div>

        {/* Righe dei giorni */}
        <div className="calendar-body">
          {monthInfo.dates.map(data => {
            const totaleDiario = fasce.reduce((sum, fascia) => {
              const presenza = presenzeMap[data]?.[fascia];
              return sum + (presenza?.numero_presenze || 0);
            }, 0);

            return (
              <div 
                key={data} 
                className={`calendar-row ${isWeekend(data) ? 'weekend' : ''}`}
              >
                <div className="date-cell">
                  <div className="day-number">{formatDate(data)}</div>
                  <div className="day-name">{getDayName(data)}</div>
                </div>
                
                {fasce.map(fascia => {
                  const presenza = presenzeMap[data]?.[fascia];
                  const numero = presenza?.numero_presenze || 0;
                  
                  return (
                    <div
                      key={`${data}-${fascia}`}
                      className={`presenza-cell ${numero > 0 ? 'has-presenze' : 'empty'} ${isWeekend(data) ? 'weekend' : ''}`}
                      onClick={() => handleCellClick(data, fascia)}
                    >
                      <div className="numero-presenze">
                        {numero > 0 ? numero : '-'}
                      </div>
                      {presenza?.note && (
                        <div className="presenza-note" title={presenza.note}>
                          📝
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <div className={`total-cell ${totaleDiario > 0 ? 'has-total' : ''}`}>
                  {totaleDiario > 0 ? totaleDiario : '-'}
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
          {statistiche.per_fascia.map(stat => (
            <div key={stat.fascia_oraria} className="fascia-stat">
              <div className="fascia-label">{stat.fascia_oraria}</div>
              <div className="fascia-values">
                <span>Totale: {stat.totale_presenze}</span>
                <span>Media: {parseFloat(stat.media_presenze.toString()).toFixed(1)}</span>
                <span>Max: {stat.max_presenze}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPdfModal = () => {
    const months: Array<{key: string, name: string}> = [];
    const currentDate = new Date();
    
    // Genera gli ultimi 12 mesi senza duplicati
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = `${mesi[date.getMonth()]} ${date.getFullYear()}`;
      
      // Evita duplicati verificando se la chiave esiste già
      if (!months.find(m => m.key === monthKey)) {
        months.push({ key: monthKey, name: monthName });
      }
    }

    return (
      <div className="presenza-modal-overlay" onClick={closePdfModal}>
        <div className="presenza-modal-content pdf-modal" onClick={(e) => e.stopPropagation()}>
          <div className="presenza-modal-header">
            <h3>📄 Scarica Report PDF</h3>
            <button className="close-button" onClick={closePdfModal}>
              ×
            </button>
          </div>
          
          <div className="presenza-modal-body">
            <p className="pdf-instructions">Seleziona i mesi di cui vuoi scaricare il report PDF:</p>
            
            <div className="months-grid">
              {months.map(month => (
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

  if (loading) {
    return (
      <div className="presenze-container">
        <div className="presenze-loading">
          <div className="loading-spinner"></div>
          <p>Caricamento presenze...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="presenze-container">
      <div className="presenze-header-section">
        <h1>👥 Gestione Presenze</h1>
        
        <div className="month-selector">
          <button
            className={`month-button ${selectedMese === 'precedente' ? 'active' : ''}`}
            onClick={() => setSelectedMese('precedente')}
          >
            ← Precedente
          </button>
          <button
            className={`month-button ${selectedMese === 'corrente' ? 'active' : ''}`}
            onClick={() => setSelectedMese('corrente')}
          >
            {monthInfo?.monthName || 'Corrente'}
          </button>
          <button
            className={`month-button ${selectedMese === 'successivo' ? 'active' : ''}`}
            onClick={() => setSelectedMese('successivo')}
          >
            Successivo →
          </button>
        </div>

        <div className="presenze-actions">
          {canDownloadPdf() && (
            <button onClick={() => setIsPdfModalOpen(true)} className="pdf-button">
              📄 Scarica PDF
            </button>
          )}
          <button onClick={toggleStats} className="stats-button">
            {showStats ? '📊 Nascondi Stats' : '📊 Mostra Stats'}
          </button>
          <button onClick={fetchPresenze} className="refresh-button">
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {message && (
        <div className={`presenze-message ${message.type}`}>
          <span className="message-icon">
            {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          {message.text}
          <button 
            className="close-message" 
            onClick={() => setMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {showStats && renderStatistiche()}

      <div className="presenze-content">
        {renderCalendarGrid()}
      </div>

      {/* Modal per modifica presenza */}
      {isModalOpen && selectedCell && (
        <div className="presenza-modal-overlay" onClick={closeModal}>
          <div className="presenza-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="presenza-modal-header">
              <h3>Modifica Presenza</h3>
              <button className="close-button" onClick={closeModal}>
                ×
              </button>
            </div>
            
            <div className="presenza-modal-body">
              <div className="presenza-info">
                <p><strong>Data:</strong> {new Date(selectedCell.data).toLocaleDateString('it-IT')}</p>
                <p><strong>Fascia oraria:</strong> {selectedCell.fascia}</p>
                <p><strong>Giorno:</strong> {getDayName(selectedCell.data)}</p>
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
                />
              </div>
            </div>
            
            <div className="presenza-modal-actions">
              <button className="cancel-button" onClick={closeModal}>
                Annulla
              </button>
              <button 
                className="delete-button" 
                onClick={handleEliminaPresenza}
                disabled={!getPresenzaByDataFascia(selectedCell.data, selectedCell.fascia)?.esistente}
              >
                🗑️ Elimina
              </button>
              <button className="save-button" onClick={handleSalvaPresenza}>
                💾 Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal per PDF */}
      {isPdfModalOpen && renderPdfModal()}
    </div>
  );
};

export default Presenze;