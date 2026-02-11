import { createClient } from "@libsql/client/web";

// ==========================================
// 1. CONFIGURAZIONE E SETUP
// ==========================================

const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
};

if (!config.url || !config.authToken) {
  console.error("Mancano le variabili d'ambiente per il DB!");
  throw new Error("Configurazione database mancante");
}

const client = createClient(config);

// Configurazione Telegram
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const ADMIN_CHAT_ID = "6008973822";

// ==========================================
// 2. FUNZIONI DI UTILITÀ (DATE E FORMATTAZIONE)
// ==========================================

function getWeekDates(weekOffset = 0) {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Domenica
  const monday = new Date(now);
  // Calcola il lunedì della settimana corrente/offset
  monday.setDate(
    now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + weekOffset * 7,
  );

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date.toISOString().split("T")[0]);
  }
  return weekDates;
}

function getDayNameFromDate(dateString) {
  const date = new Date(dateString);
  const giorni = [
    "Domenica",
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
  ];
  return giorni[date.getDay()];
}

function formatDateForMessage(dateString) {
  const date = new Date(dateString);
  const dayName = getDayNameFromDate(dateString);
  return `${dayName} ${date.getDate()}/${date.getMonth() + 1}`;
}

// Determina l'indice visivo (0-3) in base all'orario di inizio
// Serve per capire dove posizionare il turno nella griglia
function getVisualTurnoIndex(oraInizio) {
  if (!oraInizio) return 0;
  const start = parseInt(oraInizio.replace(":", ""));

  if (start < 1300) return 0; // Mattina (prima delle 13:00)
  if (start < 1600) return 1; // Pranzo (13:00 - 16:00)
  if (start < 2100) return 2; // Pomeriggio + Gap (16:00 - 21:00)
  return 3; // Sera (dopo le 21:00)
}

// ==========================================
// 3. GESTIONE TELEGRAM
// ==========================================

async function sendTelegramMessage(chatId, message) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Errore invio Telegram:", error);
  }
}

async function getUserInfo(userId) {
  try {
    const result = await client.execute({
      sql: `SELECT name, surname, username, telegram_chat_id FROM users WHERE id = ?`,
      args: [userId],
    });
    return result.rows[0];
  } catch (e) {
    return null;
  }
}

async function sendTurnoNotification(
  action,
  turnoData,
  currentUserId,
  targetUserId = null,
) {
  try {
    let recipientUserId = null;
    let message = "";
    const currentUserInfo = await getUserInfo(currentUserId);

    if (!currentUserInfo) return;

    const dayAndDate = formatDateForMessage(turnoData.data);
    const orario = `${turnoData.turno_inizio}-${turnoData.turno_fine}`;

    switch (action) {
      case "self_assigned":
        recipientUserId = currentUserId;
        message = `✅ Ti sei aggiunto al turno di ${dayAndDate} delle ${orario}`;
        break;
      case "assigned":
        if (targetUserId && targetUserId !== currentUserId) {
          recipientUserId = targetUserId;
          message = `📋 ${currentUserInfo.name} ${currentUserInfo.surname} ti ha aggiunto al turno di ${dayAndDate} delle ${orario}`;
        }
        break;
      case "self_removed":
        recipientUserId = currentUserId;
        message = `❌ Ti sei rimosso dal turno di ${dayAndDate} delle ${orario}`;
        break;
      case "removed":
        if (targetUserId && targetUserId !== currentUserId) {
          recipientUserId = targetUserId;
          message = `🗑️ ${currentUserInfo.name} ${currentUserInfo.surname} ti ha rimosso dal turno di ${dayAndDate} delle ${orario}`;
        }
        break;
      case "closed_assigned":
        recipientUserId = currentUserId;
        message = `⚠️ Ti sei aggiunto al turno STRAORDINARIO di ${dayAndDate} delle ${orario}`;
        break;
    }

    if (recipientUserId && message) {
      const targetInfo =
        recipientUserId === currentUserId
          ? currentUserInfo
          : await getUserInfo(recipientUserId);
      if (targetInfo?.telegram_chat_id) {
        await sendTelegramMessage(targetInfo.telegram_chat_id, message);
      }
    }
  } catch (error) {
    console.error("Errore notifica:", error);
  }
}

async function handleClosedTurnoRepercussions(turnoData, userId, note) {
  try {
    const userInfo = await getUserInfo(userId);
    const dayAndDate = formatDateForMessage(turnoData.data);
    const adminMessage = `🚨 <b>Richiesta Turno Straordinario</b>

👤 <b>Richiesto da:</b> ${userInfo.name} ${userInfo.surname}
📅 <b>Data:</b> ${dayAndDate}
⏰ <b>Orario:</b> ${turnoData.turno_inizio}-${turnoData.turno_fine}
${note ? `📝 <b>Motivo:</b> ${note}` : ""}

⚠️ Turno fuori standard o chiuso.`;

    await sendTelegramMessage(ADMIN_CHAT_ID, adminMessage);
  } catch (error) {
    console.error("Errore notifica admin:", error);
  }
}

// ==========================================
// 4. LOGICA GENERAZIONE TURNI (CORE)
// ==========================================

function generateStandardPlaceholders(weekDates) {
  const placeholders = [];
  const standardSlots = [
    { index: 0, inizio: "09:00", fine: "13:00" },
    { index: 1, inizio: "13:00", fine: "16:00" },
    { index: 2, inizio: "16:00", fine: "19:30" },
    { index: 3, inizio: "21:00", fine: "24:00" },
  ];

  weekDates.forEach((date, dayIndex) => {
    standardSlots.forEach((slot) => {
      // Logica base disponibilità placeholder
      let disponibile = true;
      const isWeekend = dayIndex === 5 || dayIndex === 6; // Sabato o Domenica

      // Sabato e Domenica tutto chiuso di default
      // Sera (index 3) chiusa di default
      if (isWeekend || slot.index === 3) {
        disponibile = false;
      }

      placeholders.push({
        id: `ph_${date}_${slot.index}`, // ID univoco fittizio
        data: date,
        turno_inizio: slot.inizio,
        turno_fine: slot.fine,
        day_index: dayIndex,
        turno_index: slot.index,
        is_placeholder: true, // Flag importante per il frontend
        disponibile: disponibile,
        user_id: null,
        fascia_id: null,
      });
    });
  });
  return placeholders;
}

// ==========================================
// 5. API HANDLERS
// ==========================================

// GET - Ottieni turni
async function getTurni(req, res) {
  try {
    const { settimana } = req.query;
    let weekOffset = 0;

    if (settimana === "prossima") weekOffset = 1;
    else if (settimana === "plus2") weekOffset = 2;
    else if (settimana === "plus3") weekOffset = 3;

    const weekDates = getWeekDates(weekOffset);

    // 1. Recupera TUTTI i turni reali dal DB per la settimana selezionata
    // Ordiniamo per data e orario inizio
    const dbTurni = await client.execute({
      sql: `SELECT t.*, u.name, u.surname, u.username 
            FROM turni t 
            LEFT JOIN users u ON t.user_id = u.id 
            WHERE t.data >= ? AND t.data <= ? 
            ORDER BY t.data, t.turno_inizio`,
      args: [weekDates[0], weekDates[6]],
    });

    // 2. Genera i placeholder standard (le caselle vuote)
    const placeholders = generateStandardPlaceholders(weekDates);

    // 3. MERGE INTELLIGENTE
    // Creiamo una lista finale che contiene:
    // - Tutti i turni reali
    // - I placeholder SOLO SE lo slot visivo non è occupato da nessuno

    const finalTurni = [];
    const coveredSlots = new Set(); // Per tracciare quali slot (0,1,2,3) hanno almeno un turno

    // Aggiungi i turni reali alla lista e segna gli slot coperti
    dbTurni.rows.forEach((t) => {
      const dateObj = new Date(t.data);
      const dayOfWeek = dateObj.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      // Calcola l'indice visivo (0=Mattina, 1=Pranzo, 2=Pomeriggio/Gap, 3=Sera)
      const visualIndex = getVisualTurnoIndex(t.turno_inizio);

      // Segniamo che questo slot per questo giorno ha "qualcosa"
      coveredSlots.add(`${t.data}_${visualIndex}`);

      finalTurni.push({
        ...t,
        day_index: dayIndex,
        turno_index: visualIndex,
        is_placeholder: false,
        assigned: true,
        // Normalizziamo i campi utente
        user_name: t.name,
        user_surname: t.surname,
        user_username: t.username,
      });
    });

    // Aggiungi i placeholder che non sono stati "toccati" dai turni reali
    placeholders.forEach((ph) => {
      const key = `${ph.data}_${ph.turno_index}`;
      if (!coveredSlots.has(key)) {
        finalTurni.push(ph);
      }
    });

    // Ordiniamo tutto per renderlo pulito (Data -> Orario)
    finalTurni.sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return a.turno_inizio.localeCompare(b.turno_inizio);
    });

    return res.status(200).json({
      success: true,
      turni: finalTurni,
      settimana: settimana || "corrente",
      date_range: { inizio: weekDates[0], fine: weekDates[6] },
    });
  } catch (error) {
    console.error("Errore getTurni:", error);
    return res.status(500).json({ success: false, error: "Errore server" });
  }
}

// POST - Assegna o Modifica Turno
async function assegnaTurno(req, res) {
  try {
    const {
      data,
      turno_inizio,
      turno_fine,
      user_id,
      note,
      is_closed_override,
      current_user_id,
    } = req.body;

    // Validazione base
    if (!data || !turno_inizio || !turno_fine || !user_id) {
      return res.status(400).json({ error: "Dati mancanti" });
    }

    if (turno_inizio >= turno_fine) {
      return res
        .status(400)
        .json({ error: "L'orario di fine deve essere successivo all'inizio" });
    }

    // Gestione notifica Admin per turni straordinari
    if (is_closed_override) {
      await handleClosedTurnoRepercussions(
        { data, turno_inizio, turno_fine },
        user_id,
        note,
      );
    }

    // Controlla se esiste già un turno IDENTICO (stessa data e orari precisi)
    const existing = await client.execute({
      sql: "SELECT id, user_id FROM turni WHERE data = ? AND turno_inizio = ? AND turno_fine = ?",
      args: [data, turno_inizio, turno_fine],
    });

    let action = "assigned";
    let turnoResult;

    if (existing.rows.length > 0) {
      // UPDATE: Il turno esiste già, aggiorniamo l'utente o le note
      const oldUserId = existing.rows[0].user_id;

      if (current_user_id === user_id && current_user_id === oldUserId) {
        action = "self_modified";
      } else if (current_user_id === user_id) {
        action = is_closed_override ? "closed_assigned" : "self_assigned";
      }

      const result = await client.execute({
        sql: `UPDATE turni 
              SET user_id = ?, note = ?, is_closed_override = ?, fascia_id = NULL 
              WHERE data = ? AND turno_inizio = ? AND turno_fine = ? 
              RETURNING *`,
        args: [
          user_id,
          note || "",
          is_closed_override || false,
          data,
          turno_inizio,
          turno_fine,
        ],
      });
      turnoResult = result.rows[0];
    } else {
      // INSERT: Nuovo turno (Standard o Extra)
      if (current_user_id === user_id) {
        action = is_closed_override ? "closed_assigned" : "self_assigned";
      }

      const result = await client.execute({
        sql: `INSERT INTO turni (data, turno_inizio, turno_fine, user_id, note, is_closed_override, fascia_id)
              VALUES (?, ?, ?, ?, ?, ?, NULL) 
              RETURNING *`,
        args: [
          data,
          turno_inizio,
          turno_fine,
          user_id,
          note || "",
          is_closed_override || false,
        ],
      });
      turnoResult = result.rows[0];
    }

    // Invia notifiche (se non è solo una modifica note personale)
    if (action !== "self_modified") {
      await sendTurnoNotification(
        action,
        turnoResult,
        current_user_id,
        user_id,
      );
    }

    return res.status(200).json({ success: true, turno: turnoResult });
  } catch (error) {
    console.error("Errore assegnaTurno:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// DELETE - Rimuovi Turno
async function rimuoviTurno(req, res) {
  try {
    const { data, turno_inizio, turno_fine, current_user_id } = req.body;

    if (!data || !turno_inizio || !turno_fine) {
      return res.status(400).json({ error: "Dati mancanti" });
    }

    // Controlla se il turno esiste per sapere a chi notificare
    const check = await client.execute({
      sql: "SELECT user_id FROM turni WHERE data = ? AND turno_inizio = ? AND turno_fine = ?",
      args: [data, turno_inizio, turno_fine],
    });

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Turno non trovato" });
    }

    const removedUserId = check.rows[0].user_id;

    // Esegui cancellazione
    await client.execute({
      sql: "DELETE FROM turni WHERE data = ? AND turno_inizio = ? AND turno_fine = ?",
      args: [data, turno_inizio, turno_fine],
    });

    // Gestione Notifica
    let action = "removed";
    if (current_user_id === removedUserId) {
      action = "self_removed";
    }

    await sendTurnoNotification(
      action,
      { data, turno_inizio, turno_fine },
      current_user_id,
      removedUserId,
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Errore rimuoviTurno:", error);
    return res.status(500).json({ success: false, error: "Errore server" });
  }
}

// ==========================================
// 6. MAIN HANDLER (ENTRY POINT)
// ==========================================

export default async function handler(req, res) {
  // Configurazione CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Health check veloce DB
    await client.execute("SELECT 1");

    switch (req.method) {
      case "GET":
        return await getTurni(req, res);
      case "POST":
        return await assegnaTurno(req, res);
      case "DELETE":
        return await rimuoviTurno(req, res);
      default:
        return res.status(405).json({ error: "Metodo non supportato" });
    }
  } catch (error) {
    console.error("Errore critico API:", error);
    return res.status(500).json({ error: "Errore interno del server" });
  }
}
