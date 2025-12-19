import { createClient } from "@libsql/client/web";

// Configurazione database
const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
};

if (!config.url || !config.authToken) {
  console.error("Mancano le variabili d'ambiente per il DB!");
  throw new Error("Configurazione database mancante");
}

const client = createClient(config);

// Fasce orarie disponibili (Front-end format)
const FASCE_ORARIE = ["9-13", "13-16", "16-19", "21-24"];

// --- HELPER FUNZIONI DATE ---

// Funzione per ottenere i giorni di un mese specifico
function getMonthDates(monthOffset = 0) {
  const now = new Date();
  const targetDate = new Date(
    now.getFullYear(),
    now.getMonth() + monthOffset,
    1
  );
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  // Primo giorno del mese
  const firstDay = new Date(year, month, 1);
  // Ultimo giorno del mese
  const lastDay = new Date(year, month + 1, 0);

  const monthDates = [];
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    // Gestione fuso orario locale per evitare sfasamenti di data
    const offsetDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    monthDates.push(offsetDate.toISOString().split("T")[0]);
  }

  return {
    dates: monthDates,
    monthName: targetDate.toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric",
    }),
    year: year,
    month: month + 1, // JavaScript months are 0-based
  };
}

// Funzione per ottenere dati di un mese specifico da stringa YYYY-MM
function getMonthDataFromString(monthString) {
  const [year, month] = monthString.split("-").map(Number);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthOffset = (year - currentYear) * 12 + (month - currentMonth);
  return getMonthDates(monthOffset);
}

// Funzione per ottenere il mese corrente
function getCurrentMonth() {
  return getMonthDates(0);
}

// Funzione per ottenere il mese precedente
function getPreviousMonth() {
  return getMonthDates(-1);
}

// Funzione per ottenere il mese successivo
function getNextMonth() {
  return getMonthDates(1);
}

// --- NUOVO HELPER: Normalizzazione Orari ---
// Converte il formato del DB storico ("09:00 - 13:00") o sporco ("5.0") nel formato frontend ("9-13")
function normalizzaFascia(inputFascia) {
  if (!inputFascia) return "";
  let s = String(inputFascia); // Assicura che sia stringa

  // Rimuove decimali se presenti (es. "5.0" -> "5")
  if (s.endsWith(".0")) s = s.replace(".0", "");

  // Se è già nel formato breve (es. ID convertito o stringa breve senza :), ritorna così com'è
  if (!s.includes(":")) return s;

  return s
    .replace(/:00/g, "") // Rimuove :00
    .replace(/^0/, "") // Rimuove lo 0 iniziale (09 -> 9)
    .replace(/ - 0?/, "-") // Cambia " - 0" o " - " in "-"
    .replace(/ /g, ""); // Rimuove spazi extra
}

// --- NUOVO HELPER: Recupero Dati Unificato (Attuale + Storico) ---
async function fetchUnifiedData(startDate, endDate) {
  console.log(`[DEBUG] Fetching data from ${startDate} to ${endDate}`);

  // FIX CRITICO:
  // 1. CAST(p.fascia_oraria AS INTEGER) permette di unire "5.0" con ID 5.
  // 2. COALESCE gestisce il fallback: se il JOIN fallisce (es. dato storico testuale), usa il valore originale.
  const activeQuery = `
        SELECT p.id, p.data, 
               COALESCE(f.ora_inizio || '-' || f.ora_fine, CAST(p.fascia_oraria AS TEXT)) as fascia_raw,
               p.numero_presenze, p.note, p.user_id,
               u.name, u.surname, u.username, 
               0 as is_history
        FROM presenze p
        LEFT JOIN fasce_orarie f ON CAST(p.fascia_oraria AS INTEGER) = f.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.data >= ? AND p.data <= ?
    `;

  // 2. Dati Storici (Passato)
  const historyQuery = `
        SELECT id, data, orario as fascia_raw, numero_presenze, note, 
               NULL as user_id, 'Archivio' as name, '' as surname, '' as username, 
               1 as is_history
        FROM presenze_storico
        WHERE data >= ? AND data <= ?
    `;

  let activeRows = [];
  try {
    const res = await client.execute({
      sql: activeQuery,
      args: [startDate, endDate],
    });
    activeRows = res.rows;
    console.log(`[DEBUG] Active rows found: ${activeRows.length}`);
    if (activeRows.length > 0) {
      console.log(
        "[DEBUG] Active Row Sample:",
        JSON.stringify(activeRows[0], null, 2)
      );
    }
  } catch (e) {
    console.error("[DEBUG] Error querying active table:", e);
  }

  let historyRows = [];
  try {
    const res = await client.execute({
      sql: historyQuery,
      args: [startDate, endDate],
    });
    historyRows = res.rows;
    console.log(`[DEBUG] History rows found: ${historyRows.length}`);
    if (historyRows.length > 0) {
      console.log(
        "[DEBUG] History Row Sample:",
        JSON.stringify(historyRows[0], null, 2)
      );
    }
  } catch (e) {
    // Ignora errore se la tabella storico non esiste ancora
    console.log("[DEBUG] History table might not exist or error:", e.message);
  }

  const allRows = [...activeRows, ...historyRows];

  // Normalizza e pulisce i dati unificati
  return allRows.map((row) => {
    const originalFascia = row.fascia_raw || "";
    const normalizedFascia = normalizzaFascia(originalFascia);

    // Log per capire come stiamo trasformando le fasce
    if (originalFascia !== normalizedFascia) {
      console.log(
        `[DEBUG] Normalizing fascia: '${originalFascia}' -> '${normalizedFascia}'`
      );
    }

    return {
      ...row,
      fascia_oraria: normalizedFascia,
    };
  });
}

// Handler per log delle modifiche
async function logPresenzeChange(
  presenzeId,
  data,
  fasciaOraria,
  oldValue,
  newValue,
  userId,
  action
) {
  try {
    await client.execute({
      sql: `INSERT INTO presenze_log (presenze_id, data, fascia_oraria, numero_presenze_old, numero_presenze_new, user_id, action)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        presenzeId,
        data,
        fasciaOraria,
        oldValue,
        newValue,
        userId,
        action,
      ],
    });
  } catch (error) {
    console.error("Errore nel log delle presenze:", error);
  }
}

// Funzione per generare PDF (restituisce HTML per il frontend)
async function generatePDF(presenzeData, monthsInfo) {
  try {
    // Header HTML per il PDF
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Report Presenze</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8B4513; padding-bottom: 15px; }
        .month-section { margin-bottom: 40px; page-break-inside: avoid; }
        .month-title { font-size: 18px; font-weight: bold; color: #8B4513; margin-bottom: 15px; border-left: 4px solid #D2691E; padding-left: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #8B4513; color: white; font-weight: bold; }
        .weekend { background-color: #fff3cd; }
        .has-presenze { background-color: #d4edda; font-weight: bold; }
        .total-row { background-color: #f8f9fa; font-weight: bold; }
        .stats { margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px; }
        .stats-title { font-weight: bold; margin-bottom: 8px; color: #8B4513; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Report Presenze</h1>
        <p>Generato il ${new Date().toLocaleDateString("it-IT")} alle ${new Date().toLocaleTimeString("it-IT")}</p>
        <p>Periodo: ${monthsInfo.length} mesi selezionati</p>
    </div>
`;

    // Genera sezione per ogni mese
    for (const monthData of presenzeData) {
      const monthInfo = monthData.monthInfo;
      const presenze = monthData.presenze;

      html += `
    <div class="month-section">
        <div class="month-title">${monthInfo.monthName}</div>
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Giorno</th>
                    <th>9-13</th>
                    <th>13-16</th>
                    <th>16-19</th>
                    <th>21-24</th>
                    <th>Totale</th>
                </tr>
            </thead>
            <tbody>
`;

      // Organizza presenze per data
      const presenzeMap = {};
      presenze.forEach((p) => {
        if (!presenzeMap[p.data]) {
          presenzeMap[p.data] = {};
        }
        presenzeMap[p.data][p.fascia_oraria] = p.numero_presenze;
      });

      // Genera righe per ogni giorno del mese
      monthInfo.dates.forEach((data) => {
        const date = new Date(data);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

        const totaleGiorno = FASCE_ORARIE.reduce((sum, fascia) => {
          return sum + (presenzeMap[data]?.[fascia] || 0);
        }, 0);

        html += `
                <tr class="${isWeekend ? "weekend" : ""}">
                    <td>${date.getDate()}</td>
                    <td>${dayNames[dayOfWeek]}</td>
`;

        FASCE_ORARIE.forEach((fascia) => {
          const numero = presenzeMap[data]?.[fascia] || 0;
          html += `                    <td class="${numero > 0 ? "has-presenze" : ""}">${numero > 0 ? numero : "-"}</td>\n`;
        });

        html += `                    <td class="${totaleGiorno > 0 ? "has-presenze" : ""}">${totaleGiorno > 0 ? totaleGiorno : "-"}</td>
                </tr>
`;
      });

      // Calcola totali per fascia e totale mese
      const totaliFascia = {};
      let totaleMese = 0;

      FASCE_ORARIE.forEach((fascia) => {
        totaliFascia[fascia] = presenze
          .filter((p) => p.fascia_oraria === fascia)
          .reduce((sum, p) => sum + p.numero_presenze, 0);
        totaleMese += totaliFascia[fascia];
      });

      html += `
                <tr class="total-row">
                    <td colspan="2"><strong>TOTALI MESE</strong></td>
`;

      FASCE_ORARIE.forEach((fascia) => {
        html += `                    <td><strong>${totaliFascia[fascia]}</strong></td>\n`;
      });

      html += `                    <td><strong>${totaleMese}</strong></td>
                </tr>
            </tbody>
        </table>
        
        <div class="stats">
            <div class="stats-title">Statistiche ${monthInfo.monthName}</div>
            <p><strong>Totale mese:</strong> ${totaleMese} presenze</p>
            <p><strong>Media giornaliera:</strong> ${(totaleMese / monthInfo.dates.length).toFixed(2)} presenze/giorno</p>
            <p><strong>Giorni con presenze:</strong> ${
              Object.keys(presenzeMap).filter((data) =>
                FASCE_ORARIE.some(
                  (fascia) => (presenzeMap[data]?.[fascia] || 0) > 0
                )
              ).length
            } su ${monthInfo.dates.length}</p>
        </div>
    </div>
`;
    }

    html += `
</body>
</html>`;

    return html;
  } catch (error) {
    console.error("Errore nella generazione del PDF:", error);
    throw error;
  }
}

// POST - Genera e scarica PDF (Restituisce HTML)
async function downloadPDF(req, res) {
  try {
    const { months, user_id } = req.body;

    if (!months || !Array.isArray(months) || months.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Lista mesi mancante o vuota",
      });
    }

    // Verifica permessi utente
    const userResult = await client.execute({
      sql: "SELECT level FROM users WHERE id = ?",
      args: [user_id],
    });

    if (
      !userResult.rows.length ||
      (userResult.rows[0].level !== 0 && userResult.rows[0].level !== 1)
    ) {
      return res.status(403).json({
        success: false,
        error: "Non hai i permessi per scaricare il PDF",
      });
    }

    // Raccoglie dati per tutti i mesi richiesti
    const presenzeData = [];

    for (const monthString of months) {
      try {
        const monthInfo = getMonthDataFromString(monthString);

        // Usa la funzione unificata corretta
        const rows = await fetchUnifiedData(
          monthInfo.dates[0],
          monthInfo.dates[monthInfo.dates.length - 1]
        );

        // Ordina per data e fascia
        rows.sort((a, b) => {
          if (a.data !== b.data) return a.data.localeCompare(b.data);
          return (
            FASCE_ORARIE.indexOf(a.fascia_oraria) -
            FASCE_ORARIE.indexOf(b.fascia_oraria)
          );
        });

        // Filtra solo le fasce valide per il PDF (opzionale, ma pulisce il report)
        const filteredRows = rows.filter((r) =>
          FASCE_ORARIE.includes(r.fascia_oraria)
        );

        presenzeData.push({
          monthInfo: monthInfo,
          presenze: filteredRows,
        });
      } catch (error) {
        console.error(
          `Errore nel recupero dati per il mese ${monthString}:`,
          error
        );
      }
    }

    if (presenzeData.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nessun dato trovato per i mesi selezionati",
      });
    }

    // Genera HTML per PDF
    const htmlContent = await generatePDF(presenzeData, months);

    return res.status(200).json({
      success: true,
      message: "Report generato con successo",
      html: htmlContent,
      months_processed: presenzeData.length,
    });
  } catch (error) {
    console.error("Errore nella generazione PDF:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server nella generazione PDF",
    });
  }
}

// GET - Ottieni presenze del mese
async function getPresenze(req, res) {
  try {
    const { mese } = req.query; // 'corrente', 'precedente', 'successivo', o 'YYYY-MM'

    let monthData;

    if (mese === "precedente") {
      monthData = getPreviousMonth();
    } else if (mese === "successivo") {
      monthData = getNextMonth();
    } else if (mese && mese.match(/^\d{4}-\d{2}$/)) {
      // Formato YYYY-MM specifico
      monthData = getMonthDataFromString(mese);
    } else {
      monthData = getCurrentMonth();
    }

    // Recupera dati unificati (Attivi + Storico)
    const rows = await fetchUnifiedData(
      monthData.dates[0],
      monthData.dates[monthData.dates.length - 1]
    );

    // Mappa TUTTE le righe per il frontend
    const presenzeComplete = rows.map((row) => ({
      id: row.id,
      data: row.data,
      fascia_oraria: row.fascia_oraria,
      numero_presenze: row.numero_presenze,
      note: row.note || "",
      user_id: row.user_id,
      user_name: row.name || "",
      user_surname: row.surname || "",
      user_username: row.username || "",
      day_of_week: new Date(row.data).getDay(),
      esistente: true,
      is_history: row.is_history === 1,
    }));

    return res.status(200).json({
      success: true,
      presenze: presenzeComplete,
      month_info: monthData,
      mese: mese || "corrente",
    });
  } catch (error) {
    console.error("Errore nel recupero presenze:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
    });
  }
}

// POST - Aggiorna presenze
async function aggiornaPresenze(req, res) {
  try {
    const { data, fascia_oraria, numero_presenze, note, current_user_id } =
      req.body;

    if (
      !data ||
      !fascia_oraria ||
      numero_presenze === undefined ||
      numero_presenze === null
    ) {
      return res.status(400).json({
        success: false,
        error: "Dati mancanti",
      });
    }

    const numeroPresenze = parseInt(numero_presenze);
    if (isNaN(numeroPresenze) || numeroPresenze < 0) {
      return res.status(400).json({
        success: false,
        error: "Numero presenze deve essere un numero positivo",
      });
    }

    // Mapping Frontend -> Backend
    const mapOrari = {
      "9-13": { start: "09:00" },
      "13-16": { start: "13:00" },
      "16-19": { start: "16:00" },
      "21-24": { start: "21:00" },
    };
    const target = mapOrari[fascia_oraria];

    // Trova il giorno usando i nomi esatti (minuscoli) come nel DB
    const days = [
      "domenica",
      "lunedì",
      "martedì",
      "mercoledì",
      "giovedì",
      "venerdì",
      "sabato",
    ];
    const dateObj = new Date(data);
    const giornoTarget = days[dateObj.getDay()];

    // Cerca l'ID nella tabella fasce_orarie attiva
    let fasciaIdReale = null;

    if (target) {
      const idFasciaRes = await client.execute({
        sql: `SELECT id FROM fasce_orarie WHERE giorno = ? AND ora_inizio = ?`,
        args: [giornoTarget, target.start],
      });
      if (idFasciaRes.rows.length > 0) {
        fasciaIdReale = idFasciaRes.rows[0].id;
      }
    }

    if (!fasciaIdReale) {
      return res.status(403).json({
        success: false,
        error:
          "Modifica non consentita: Settimana archiviata o fascia non attiva per " +
          giornoTarget,
      });
    }

    // Verifica esistenza
    const esistente = await client.execute({
      sql: "SELECT id, numero_presenze FROM presenze WHERE data = ? AND fascia_oraria = ?",
      args: [data, fasciaIdReale],
    });

    let result;
    let action;

    if (esistente.rows.length > 0) {
      const oldValue = esistente.rows[0].numero_presenze;

      // UPDATE
      result = await client.execute({
        sql: `UPDATE presenze SET numero_presenze = ?, note = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
              RETURNING id, data, fascia_oraria, numero_presenze, note, user_id`,
        args: [
          numeroPresenze,
          note || "",
          current_user_id,
          esistente.rows[0].id,
        ],
      });

      action = "UPDATE";

      await logPresenzeChange(
        esistente.rows[0].id,
        data,
        fascia_oraria,
        oldValue,
        numeroPresenze,
        current_user_id,
        action
      );
    } else {
      // INSERT
      result = await client.execute({
        sql: `INSERT INTO presenze (data, fascia_oraria, numero_presenze, note, user_id)
              VALUES (?, ?, ?, ?, ?)
              RETURNING id, data, fascia_oraria, numero_presenze, note, user_id`,
        args: [
          data,
          fasciaIdReale,
          numeroPresenze,
          note || "",
          current_user_id,
        ],
      });

      action = "INSERT";

      await logPresenzeChange(
        result.rows[0].id,
        data,
        fascia_oraria,
        null,
        numeroPresenze,
        current_user_id,
        action
      );
    }

    return res.status(200).json({
      success: true,
      presenza: result.rows[0],
      action: action.toLowerCase(),
    });
  } catch (error) {
    console.error("Errore nell'aggiornamento presenze:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
    });
  }
}

// DELETE - Elimina presenza (opzionale)
async function eliminaPresenza(req, res) {
  try {
    const { data, fascia_oraria, current_user_id } = req.body;

    if (!data || !fascia_oraria) {
      return res.status(400).json({ success: false, error: "Dati mancanti" });
    }

    const mapOrari = {
      "9-13": { start: "09:00" },
      "13-16": { start: "13:00" },
      "16-19": { start: "16:00" },
      "21-24": { start: "21:00" },
    };
    const target = mapOrari[fascia_oraria];
    const dateObj = new Date(data);
    const days = [
      "domenica",
      "lunedì",
      "martedì",
      "mercoledì",
      "giovedì",
      "venerdì",
      "sabato",
    ];
    const giornoTarget = days[dateObj.getDay()];

    let fasciaIdReale = null;
    if (target) {
      const idRes = await client.execute({
        sql: `SELECT id FROM fasce_orarie WHERE giorno = ? AND ora_inizio = ?`,
        args: [giornoTarget, target.start],
      });
      if (idRes.rows.length > 0) fasciaIdReale = idRes.rows[0].id;
    }

    if (!fasciaIdReale) {
      return res.status(403).json({
        success: false,
        error: "Impossibile eliminare dati archiviati o fascia non attiva",
      });
    }

    const esistente = await client.execute({
      sql: "SELECT id, numero_presenze FROM presenze WHERE data = ? AND fascia_oraria = ?",
      args: [data, fasciaIdReale],
    });

    if (esistente.rows.length > 0) {
      const oldValue = esistente.rows[0].numero_presenze;

      const result = await client.execute({
        sql: "DELETE FROM presenze WHERE id = ?",
        args: [esistente.rows[0].id],
      });

      if (result.rowsAffected > 0) {
        await logPresenzeChange(
          esistente.rows[0].id,
          data,
          fascia_oraria,
          oldValue,
          null,
          current_user_id,
          "DELETE"
        );
      }

      return res.status(200).json({
        success: true,
        deleted: result.rowsAffected > 0,
      });
    } else {
      return res.status(404).json({
        success: false,
        error: "Presenza non trovata",
      });
    }
  } catch (error) {
    console.error("Errore nell'eliminazione presenza:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
    });
  }
}

// GET - Ottieni statistiche mensili
async function getStatistiche(req, res) {
  try {
    const { mese } = req.query;

    let monthData;
    if (mese === "precedente") {
      monthData = getPreviousMonth();
    } else if (mese === "successivo") {
      monthData = getNextMonth();
    } else {
      monthData = getCurrentMonth();
    }

    const mergedRows = await fetchUnifiedData(
      monthData.dates[0],
      monthData.dates[monthData.dates.length - 1]
    );

    // Filtra solo record con presenze > 0
    const validRowsTotal = mergedRows.filter((r) => r.numero_presenze > 0);
    const totalMese = validRowsTotal.reduce(
      (sum, r) => sum + r.numero_presenze,
      0
    );

    // Per il dettaglio per fascia, prendiamo solo quelle standard
    const validRowsFasce = validRowsTotal.filter((r) =>
      FASCE_ORARIE.includes(r.fascia_oraria)
    );

    const perFasciaMap = {};

    validRowsFasce.forEach((r) => {
      if (!perFasciaMap[r.fascia_oraria]) {
        perFasciaMap[r.fascia_oraria] = { total: 0, count: 0, max: 0 };
      }
      const stats = perFasciaMap[r.fascia_oraria];
      stats.total += r.numero_presenze;
      stats.count += 1;
      if (r.numero_presenze > stats.max) stats.max = r.numero_presenze;
    });

    const perFasciaArray = Object.keys(perFasciaMap)
      .map((fascia) => ({
        fascia_oraria: fascia,
        totale_presenze: perFasciaMap[fascia].total,
        media_presenze: (
          perFasciaMap[fascia].total / perFasciaMap[fascia].count
        ).toFixed(2),
        max_presenze: perFasciaMap[fascia].max,
        giorni_registrati: perFasciaMap[fascia].count,
      }))
      .sort(
        (a, b) =>
          FASCE_ORARIE.indexOf(a.fascia_oraria) -
          FASCE_ORARIE.indexOf(b.fascia_oraria)
      );

    return res.status(200).json({
      success: true,
      statistiche: {
        per_fascia: perFasciaArray,
        totale_mese: totalMese,
        media_giornaliera: (totalMese / monthData.dates.length).toFixed(2),
        month_info: monthData,
      },
    });
  } catch (error) {
    console.error("Errore nel recupero statistiche:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
    });
  }
}

// Handler principale
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Test connessione DB
    await client.execute("SELECT 1");

    // Route per PDF download
    if (req.method === "POST" && req.url?.includes("download-pdf")) {
      return await downloadPDF(req, res);
    }

    // Route per statistiche
    if (req.method === "GET" && req.query.stats === "true") {
      return await getStatistiche(req, res);
    }

    switch (req.method) {
      case "GET":
        return await getPresenze(req, res);
      case "POST":
        return await aggiornaPresenze(req, res);
      case "DELETE":
        return await eliminaPresenza(req, res);
      default:
        return res.status(405).json({
          success: false,
          error: "Metodo non supportato",
        });
    }
  } catch (error) {
    console.error("Errore API presenze:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
    });
  }
}
