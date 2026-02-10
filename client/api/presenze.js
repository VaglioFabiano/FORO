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

function getMonthDates(monthOffset = 0) {
  const now = new Date();
  const targetDate = new Date(
    now.getFullYear(),
    now.getMonth() + monthOffset,
    1,
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

// --- NORMALIZZAZIONE INTELLIGENTE (FORZATURA) ---
// Nel file backend (api/presenze.js o ts)

function normalizzaFascia(inputFascia) {
  if (!inputFascia) return "";
  let s = String(inputFascia).trim();

  // 1. Pulizia formati numerici
  if (s.endsWith(".0")) s = s.replace(".0", "");

  // 2. Se è standard, ok
  if (FASCE_ORARIE.includes(s)) return s;

  // 3. Analisi euristica estesa
  const match = s.match(/^0?(\d{1,2})/);

  if (match) {
    const hour = parseInt(match[1], 10);

    // Mappatura ESTESA per coprire tutte le 24 ore
    // Mattina estesa: dalle 05:00 alle 12:59 -> 9-13
    if (hour >= 5 && hour < 13) return "9-13";

    // Pomeriggio 1: dalle 13:00 alle 15:59 -> 13-16
    if (hour >= 13 && hour < 16) return "13-16";

    // Pomeriggio 2: dalle 16:00 alle 19:59 -> 16-19
    // (Esteso fino alle 20 per catturare chi timbra tardi)
    if (hour >= 16 && hour < 20) return "16-19";

    // Sera/Notte: dalle 20:00 alle 04:59 -> 21-24
    if (hour >= 20 || hour < 5) return "21-24";
  }

  // Se è proprio testo strano, lo ritorniamo, ma il frontend dovrà gestirlo
  return s;
}

// --- RECUPERO DATI UNIFICATO ---
async function fetchUnifiedData(startDate, endDate) {
  console.log(`[DEBUG] Fetching data from ${startDate} to ${endDate}`);

  // FIX: CAST e COALESCE per leggere sia ID numerici che stringhe di fallback
  const activeQuery = `
    SELECT p.id, p.data, 
           CASE 
               -- SE contiene un trattino, usa il valore originale (è già formattato)
               WHEN p.fascia_oraria LIKE '%-%' THEN CAST(p.fascia_oraria AS TEXT)
               -- ALTRIMENTI prova a cercare l'orario nella tabella fasce_orarie
               ELSE COALESCE(f.ora_inizio || '-' || f.ora_fine, CAST(p.fascia_oraria AS TEXT))
           END as fascia_raw,
           p.numero_presenze, p.note, p.user_id,
           u.name, u.surname, u.username, 
           0 as is_history
    FROM presenze p
    LEFT JOIN fasce_orarie f ON (
        -- Unisci SOLO se NON sembra una stringa di orario (nessun trattino)
        p.fascia_oraria NOT LIKE '%-%' 
        AND CAST(p.fascia_oraria AS INTEGER) = f.id
    )
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.data >= ? AND p.data <= ?
`;

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
  } catch (e) {
    // Ignora errore se la tabella storico non esiste
  }

  const allRows = [...activeRows, ...historyRows];

  // Normalizza e pulisce i dati unificati
  return allRows.map((row) => {
    const raw = row.fascia_raw || "";
    const normalized = normalizzaFascia(raw);

    return {
      ...row,
      fascia_oraria: normalized,
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
  action,
) {
  try {
    await client.execute({
      sql: `INSERT INTO presenze_log (presenze_id, data, fascia_oraria, numero_presenze_old, numero_presenze_new, user_id, action) VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

// --- GENERAZIONE PDF ---
async function generatePDF(presenzeData, monthsInfo) {
  try {
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

      const presenzeMap = {};
      presenze.forEach((p) => {
        if (!presenzeMap[p.data]) presenzeMap[p.data] = {};
        presenzeMap[p.data][p.fascia_oraria] = p.numero_presenze;
      });

      monthInfo.dates.forEach((data) => {
        const date = new Date(data);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

        // Somma tutto il giorno, anche fasce non standard
        const dayRecords = presenze.filter((p) => p.data === data);
        const totaleGiorno = dayRecords.reduce(
          (sum, p) => sum + p.numero_presenze,
          0,
        );

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

      const totaliFascia = {};
      let totaleMese = 0;

      FASCE_ORARIE.forEach((fascia) => {
        totaliFascia[fascia] = presenze
          .filter((p) => p.fascia_oraria === fascia)
          .reduce((sum, p) => sum + p.numero_presenze, 0);
        totaleMese += totaliFascia[fascia];
      });

      // Aggiungi al totale mese anche le fasce extra non tabellate
      const extraTotal = presenze
        .filter((p) => !FASCE_ORARIE.includes(p.fascia_oraria))
        .reduce((sum, p) => sum + p.numero_presenze, 0);
      totaleMese += extraTotal;

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

// POST - Download PDF Endpoint
async function downloadPDF(req, res) {
  try {
    const { months, user_id } = req.body;
    if (!months || !Array.isArray(months) || months.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Lista mesi mancante" });
    }

    const userResult = await client.execute({
      sql: "SELECT level FROM users WHERE id = ?",
      args: [user_id],
    });

    if (
      !userResult.rows.length ||
      (userResult.rows[0].level !== 0 && userResult.rows[0].level !== 1)
    ) {
      return res
        .status(403)
        .json({ success: false, error: "Permessi insufficienti" });
    }

    const presenzeData = [];
    for (const monthString of months) {
      try {
        const monthInfo = getMonthDataFromString(monthString);
        const rows = await fetchUnifiedData(
          monthInfo.dates[0],
          monthInfo.dates[monthInfo.dates.length - 1],
        );

        rows.sort((a, b) => {
          if (a.data !== b.data) return a.data.localeCompare(b.data);
          return (
            FASCE_ORARIE.indexOf(a.fascia_oraria) -
            FASCE_ORARIE.indexOf(b.fascia_oraria)
          );
        });

        const filteredRows = rows.filter((r) => r.numero_presenze > 0); // Includi tutti per il PDF
        presenzeData.push({ monthInfo: monthInfo, presenze: filteredRows });
      } catch (e) {
        console.error(e);
      }
    }

    if (presenzeData.length === 0)
      return res.status(400).json({ success: false, error: "Nessun dato" });

    const htmlContent = await generatePDF(presenzeData, months);
    return res.status(200).json({ success: true, html: htmlContent });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Errore server PDF" });
  }
}

// GET - Presenze
async function getPresenze(req, res) {
  try {
    const { mese } = req.query;
    let monthData;

    if (mese === "precedente") monthData = getPreviousMonth();
    else if (mese === "successivo") monthData = getNextMonth();
    else if (mese && mese.match(/^\d{4}-\d{2}$/))
      monthData = getMonthDataFromString(mese);
    else monthData = getCurrentMonth();

    const rows = await fetchUnifiedData(
      monthData.dates[0],
      monthData.dates[monthData.dates.length - 1],
    );

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
    return res
      .status(500)
      .json({ success: false, error: "Errore interno server" });
  }
}

// POST - Aggiorna con FALLBACK per fasce non configurate
async function aggiornaPresenze(req, res) {
  try {
    const { data, fascia_oraria, numero_presenze, note, current_user_id } =
      req.body;

    // 1. Validazione input
    if (
      !data ||
      !fascia_oraria ||
      numero_presenze === undefined ||
      numero_presenze === null
    ) {
      return res.status(400).json({ success: false, error: "Dati mancanti" });
    }

    // 2. Normalizzazione della fascia (rimuove .0 e spazi)
    // Questo impedisce che "9-13" diventi "1.0" o simili
    const fasciaDaSalvare = String(fascia_oraria).replace(".0", "").trim();
    const valorePresenze = parseInt(numero_presenze, 10) || 0;

    // 3. Controllo esistenza record
    // Cerchiamo il record per data e stringa della fascia
    const check = await client.execute({
      sql: "SELECT id, numero_presenze FROM presenze WHERE data = ? AND fascia_oraria = ?",
      args: [data, fasciaDaSalvare],
    });

    let result;
    let action;

    if (check.rows.length > 0) {
      // --- OPERAZIONE: UPDATE ---
      const existingId = check.rows[0].id;
      const oldVal = check.rows[0].numero_presenze;

      result = await client.execute({
        sql: `UPDATE presenze 
              SET numero_presenze = ?, 
                  note = ?, 
                  user_id = ?, 
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ? 
              RETURNING id`,
        args: [valorePresenze, note || "", current_user_id, existingId],
      });

      action = "UPDATE";

      // Log del cambiamento
      await logPresenzeChange(
        existingId,
        data,
        fasciaDaSalvare,
        oldVal,
        valorePresenze,
        current_user_id,
        action,
      );
    } else {
      // --- OPERAZIONE: INSERT ---
      result = await client.execute({
        sql: `INSERT INTO presenze (data, fascia_oraria, numero_presenze, note, user_id) 
              VALUES (?, ?, ?, ?, ?) 
              RETURNING id`,
        args: [
          data,
          fasciaDaSalvare,
          valorePresenze,
          note || "",
          current_user_id,
        ],
      });

      action = "INSERT";

      // Log del nuovo inserimento
      await logPresenzeChange(
        result.rows[0].id,
        data,
        fasciaDaSalvare,
        null,
        valorePresenze,
        current_user_id,
        action,
      );
    }

    return res.status(200).json({
      success: true,
      presenza: result.rows[0],
      action,
      normalizedFascia: fasciaDaSalvare,
    });
  } catch (error) {
    console.error("[API AggiornaPresenze] Errore critico:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno durante il salvataggio",
    });
  }
}

async function eliminaPresenza(req, res) {
  try {
    const { data, fascia_oraria, current_user_id } = req.body;

    if (!data || !fascia_oraria) {
      return res.status(400).json({ success: false, error: "Dati mancanti" });
    }

    // 1. NORMALIZZAZIONE: Usiamo la stessa logica dell'aggiornamento
    // Rimuoviamo eventuali ".0" e spazi, forzando il tipo String
    let fasciaDaCancellare = String(fascia_oraria).replace(".0", "").trim();

    // Fix retroattivo: se il frontend manda ancora numeri vecchi per errore
    if (fasciaDaCancellare === "1") fasciaDaCancellare = "9-13";
    if (fasciaDaCancellare === "2") fasciaDaCancellare = "13-16";
    if (fasciaDaCancellare === "3") fasciaDaCancellare = "16-19";
    if (fasciaDaCancellare === "4") fasciaDaCancellare = "21-24";

    console.log(
      `[DEBUG] Tentativo eliminazione: ${data} - ${fasciaDaCancellare}`,
    );

    // 2. Cerchiamo il record usando la stringa corretta
    const check = await client.execute({
      sql: "SELECT id, numero_presenze FROM presenze WHERE data = ? AND fascia_oraria = ?",
      args: [data, fasciaDaCancellare],
    });

    if (check.rows.length > 0) {
      const idRecord = check.rows[0].id;
      const presenzeVecchie = check.rows[0].numero_presenze;

      // 3. Eseguiamo la cancellazione per ID
      const result = await client.execute({
        sql: "DELETE FROM presenze WHERE id = ?",
        args: [idRecord],
      });

      if (result.rowsAffected > 0) {
        // Log dell'azione
        await logPresenzeChange(
          idRecord,
          data,
          fasciaDaCancellare,
          presenzeVecchie,
          null, // Valore nuovo nullo per cancellazione
          current_user_id,
          "DELETE",
        );
      }

      return res.status(200).json({ success: true, deleted: true });
    } else {
      console.warn("[WARN] Nessun record trovato da eliminare");
      return res
        .status(404)
        .json({ success: false, error: "Presenza non trovata" });
    }
  } catch (error) {
    console.error("Errore eliminazione:", error);
    return res.status(500).json({ success: false, error: "Errore interno" });
  }
}

// GET - Stats
async function getStatistiche(req, res) {
  try {
    const { mese } = req.query;
    let monthData;
    if (mese === "precedente") monthData = getPreviousMonth();
    else if (mese === "successivo") monthData = getNextMonth();
    else monthData = getCurrentMonth();

    const rows = await fetchUnifiedData(
      monthData.dates[0],
      monthData.dates[monthData.dates.length - 1],
    );
    const validRows = rows.filter((r) => r.numero_presenze > 0);
    const totalMese = validRows.reduce((sum, r) => sum + r.numero_presenze, 0);

    const perFasciaMap = {};
    validRows.forEach((r) => {
      const fKey = FASCE_ORARIE.includes(r.fascia_oraria)
        ? r.fascia_oraria
        : "Altro";
      if (!perFasciaMap[fKey])
        perFasciaMap[fKey] = { total: 0, count: 0, max: 0 };
      const s = perFasciaMap[fKey];
      s.total += r.numero_presenze;
      s.count++;
      if (r.numero_presenze > s.max) s.max = r.numero_presenze;
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
          FASCE_ORARIE.indexOf(b.fascia_oraria),
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
    return res.status(500).json({ success: false, error: "Errore stats" });
  }
}

// MAIN
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await client.execute("SELECT 1");

    if (req.method === "POST" && req.url?.includes("download-pdf"))
      return await downloadPDF(req, res);
    if (req.method === "GET" && req.query.stats === "true")
      return await getStatistiche(req, res);

    switch (req.method) {
      case "GET":
        return await getPresenze(req, res);
      case "POST":
        return await aggiornaPresenze(req, res);
      case "DELETE":
        return await eliminaPresenza(req, res);
      default:
        return res
          .status(405)
          .json({ success: false, error: "Metodo non supportato" });
    }
  } catch (error) {
    console.error("Errore API:", error);
    return res
      .status(500)
      .json({ success: false, error: "Errore interno server" });
  }
}
