// api/cron.js
import { createClient } from "@libsql/client/web";
import { Resend } from "resend";

// Inizializza i client (usa le variabili d'ambiente di Vercel)
const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
};

let db = null;
if (config.url && config.authToken) {
  db = createClient(config);
} else {
  console.warn(
    "⚠️ Database config mancante, alcune funzioni potrebbero non funzionare"
  );
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Configurazione Telegram
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TEST_CHAT_ID = "1129901266"; // Chat ID per i test

// Link Google Sheets per le presenze
const GOOGLE_SHEETS_LINK =
  "https://docs.google.com/spreadsheets/d/1JO-0aETjC09KJk-RptMsdc1CXnilvP6z/edit?gid=887368033#gid=887368033";

// FUNZIONE PER OTTENERE L'ORARIO ITALIANO
function getItalianTime() {
  const now = new Date();

  // Crea un oggetto Date per il fuso orario italiano
  const italianTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Rome" })
  );

  return {
    date: italianTime,
    hour: italianTime.getHours(),
    minute: italianTime.getMinutes(),
    day: italianTime.getDay(), // 0 = Domenica, 1 = Lunedì, etc.
    dateString: italianTime.toISOString().split("T")[0], // YYYY-MM-DD
  };
}
/*
export default async function handler(req, res) {
  // Accetta sia GET che POST per test
  if (!["GET", "POST"].includes(req.method)) {
    return res
      .status(405)
      .json({ error: "Method not allowed. Use GET or POST." });
  }

  // Usa l'orario italiano invece di quello del server
  const italianTime = getItalianTime();
  const {
    date: now,
    hour: currentHour,
    minute: currentMinute,
    day: currentDay,
  } = italianTime;

  console.log(
    `🕐 Cron job eseguito alle ${currentHour}:${currentMinute.toString().padStart(2, "0")} del ${getDayName(currentDay)} (orario italiano)`
  );

  try {
    // Determina il task in base all'orario attuale ITALIANO
    const taskType = determineTaskType(currentHour, currentMinute, currentDay);

    if (taskType) {
      await handleTask(taskType, now);
      await logExecution(taskType, now, "success");

      return res.status(200).json({
        message: "Cron job completato con successo",
        taskType: taskType,
        timestamp: now.toISOString(),
        italianTime: `${currentHour}:${currentMinute.toString().padStart(2, "0")}`,
        executed: true,
      });
    } else {
      // Esegui comunque un task di default per i test
      await handleTask("general_task", now);

      return res.status(200).json({
        message: "Task generale eseguito",
        taskType: "general_task",
        timestamp: now.toISOString(),
        italianTime: `${currentHour}:${currentMinute.toString().padStart(2, "0")}`,
        executed: true,
      });
    }
  } catch (error) {
    console.error("❌ Errore nel cron job:", error);

    await logExecution("error_task", now, "error", error.message).catch(
      () => {}
    );

    return res.status(500).json({
      error: "Errore interno del server",
      timestamp: now.toISOString(),
      italianTime: `${currentHour}:${currentMinute.toString().padStart(2, "0")}`,
      details: error.message,
    });
  }
}
*/

function determineTaskType(hour, minute, day) {
  console.log(
    `🔍 CRON DEBUG: hour=${hour}, minute=${minute}, day=${day} (${getDayName(day)})`
  );

  // PROMEMORIA TURNI
  if (hour === 8 && minute === 0) {
    return "reminder_morning"; // Promemoria turni 9:00-13:00
  }

  // PRIORITÀ AL REPORT SETTIMANALE - Sabato 12:00
  if (hour === 12 && minute === 0 && day === 6) {
    console.log("📋 Sabato 12:00 - Eseguendo weekly_empty_shifts_report");
    return "weekly_empty_shifts_report";
  }

  // PROMEMORIA TURNI
  if (hour === 12 && minute === 0) {
    console.log("🔔 Altri giorni 12:00 - Eseguendo reminder_early_afternoon");
    return "reminder_early_afternoon"; // Promemoria turni 13:00-16:00
  }

  if (hour === 15 && minute === 0) {
    return "reminder_late_afternoon"; // Promemoria turni 16:00-19:30
  }

  if (hour === 20 && minute === 30) {
    return "reminder_evening"; // Promemoria turni 21:00-24:00
  }

  // PROMEMORIA PRESENZE
  if (hour === 12 && minute === 30) {
    return "reminder_presenze_9_13"; // Promemoria riempire presenze 9-13
  }

  if (hour === 15 && minute === 30) {
    return "reminder_presenze_13_16"; // Promemoria riempire presenze 13-16
  }

  if (hour === 19 && minute === 0) {
    return "reminder_presenze_16_19"; // Promemoria riempire presenze 16-19:30
  }

  if (hour === 23 && minute === 30) {
    return "reminder_presenze_21_24"; // Promemoria riempire presenze 21-24
  }

  // CAMBIO SETTIMANA - Domenica 23:59 (orario italiano)
  if (hour === 23 && minute === 59 && day === 0) {
    return "sunday_end_task";
  }

  return null;
}

// Funzione principale per gestire i diversi task
async function handleTask(taskType, timestamp) {
  const italianTime = getItalianTime();
  console.log(
    `🚀 Eseguendo task: ${taskType} alle ${italianTime.hour}:${italianTime.minute.toString().padStart(2, "0")} (orario italiano)`
  );

  switch (taskType) {
    case "reminder_morning":
      await sendTurnoReminders("09:00", "13:00", timestamp);
      break;

    case "reminder_early_afternoon":
      await sendTurnoReminders("13:00", "16:00", timestamp);
      break;

    case "reminder_late_afternoon":
      await sendTurnoReminders("16:00", "19:30", timestamp);
      break;

    case "reminder_evening":
      await sendTurnoReminders("21:00", "24:00", timestamp);
      break;

    case "reminder_presenze_9_13":
      await sendPresenzeReminderToShifts("9-13", "09:00", "13:00", timestamp);
      break;

    case "reminder_presenze_13_16":
      await sendPresenzeReminderToShifts("13-16", "13:00", "16:00", timestamp);
      break;

    case "reminder_presenze_16_19":
      await sendPresenzeReminderToShifts(
        "16-19:30",
        "16:00",
        "19:30",
        timestamp
      );
      break;

    case "reminder_presenze_21_24":
      await sendPresenzeReminderToShifts("21-24", "21:00", "24:00", timestamp);
      break;

    case "weekly_empty_shifts_report":
      await weeklyEmptyShiftsReport(timestamp);
      break;

    case "sunday_end_task":
      await sundayEndTask(timestamp);
      break;

    case "general_task":
      await generalTask(timestamp);
      break;

    default:
      console.log("⚠️ Task non riconosciuto:", taskType);
      await generalTask(timestamp);
  }
}

// Funzione per ottenere le date di una settimana specifica
function getWeekDatesForOffset(weekOffset = 0) {
  const italianTime = getItalianTime();
  const now = italianTime.date;
  const currentDay = now.getDay();
  const monday = new Date(now);
  monday.setDate(
    now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + weekOffset * 7
  );

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date.toISOString().split("T")[0]);
  }
  return weekDates;
}

// Funzione per inviare messaggi Telegram
async function sendTelegramMessage(chatId, message) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.description || "Errore nell'invio del messaggio");
    }

    console.log("✅ Messaggio Telegram inviato con successo");
    return data.result;
  } catch (error) {
    console.error("❌ Errore invio messaggio Telegram:", error);
    throw error;
  }
}

// FUNZIONE PRINCIPALE: Invia promemoria turni
async function sendTurnoReminders(turnoInizio, turnoFine, timestamp) {
  try {
    if (!db) {
      const italianTime = getItalianTime();
      console.log("⚠️ Database non disponibile, invio messaggio di test");
      await sendTelegramMessage(
        TEST_CHAT_ID,
        `🔔 Test Promemoria Turni ${turnoInizio}-${turnoFine}\n⏰ ${italianTime.hour}:${italianTime.minute.toString().padStart(2, "0")} (orario italiano)`
      );
      return;
    }

    // Ottieni la data di oggi (italiana)
    const italianTime = getItalianTime();
    const today = italianTime.dateString;

    console.log(
      `📋 Cercando turni per oggi ${today} dalle ${turnoInizio} alle ${turnoFine}`
    );

    // Query per ottenere tutti i turni di oggi per questa fascia oraria
    const result = await db.execute({
      sql: `SELECT t.data, t.turno_inizio, t.turno_fine, t.user_id, t.note,
                   u.name, u.surname, u.telegram_chat_id
            FROM turni t
            JOIN users u ON t.user_id = u.id
            WHERE t.data = ? AND t.turno_inizio = ? AND t.turno_fine = ?
            AND u.telegram_chat_id IS NOT NULL`,
      args: [today, turnoInizio, turnoFine],
    });

    const turni = result.rows;
    console.log(
      `📊 Trovati ${turni.length} turni per la fascia ${turnoInizio}-${turnoFine}`
    );

    if (turni.length === 0) {
      console.log(
        `📋 Nessun turno trovato per la fascia ${turnoInizio}-${turnoFine}`
      );
      return;
    }

    // Invia promemoria a ogni persona in turno
    for (const turno of turni) {
      try {
        const message = `🔔 <b>Promemoria Turno</b>

Ciao <b>${turno.name} ${turno.surname}</b>, ti ricordo il tuo turno di oggi orario <b>${turno.turno_inizio}-${turno.turno_fine}</b> in aula studio foro.

📅 Data: ${formatDate(turno.data)}
⏰ Orario: ${turno.turno_inizio} - ${turno.turno_fine}
${turno.note ? `📝 Note: ${turno.note}` : ""}

Buono Studio! 💪`;

        await sendTelegramMessage(turno.telegram_chat_id, message);

        // Piccola pausa tra i messaggi
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `❌ Errore invio promemoria a ${turno.name} ${turno.surname}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("❌ Errore generale invio promemoria:", error);
  }
}

// FUNZIONE PER PROMEMORIA PRESENZE - Solo a chi è di turno (CON LINK SHEETS)
async function sendPresenzeReminderToShifts(
  fasciaOraria,
  turnoInizio,
  turnoFine,
  timestamp
) {
  try {
    if (!db) {
      const italianTime = getItalianTime();
      console.log("⚠️ Database non disponibile, invio messaggio di test");
      await sendTelegramMessage(
        TEST_CHAT_ID,
        `📊 Test Promemoria Presenze ${fasciaOraria}\n⏰ ${italianTime.hour}:${italianTime.minute.toString().padStart(2, "0")} (orario italiano)\n\n📋 Accedi al Google Sheets: ${GOOGLE_SHEETS_LINK}`
      );
      return;
    }

    // Ottieni la data di oggi (italiana)
    const italianTime = getItalianTime();
    const today = italianTime.dateString;

    console.log(
      `📊 Promemoria presenze per la fascia ${fasciaOraria} del ${today}`
    );

    // Verifica se le presenze per oggi sono già state inserite
    const presenzeEsistenti = await db.execute({
      sql: `SELECT numero_presenze FROM presenze WHERE data = ? AND fascia_oraria = ?`,
      args: [today, fasciaOraria],
    });

    // Ottieni solo gli utenti che sono di turno in questa fascia oraria
    const turniResult = await db.execute({
      sql: `SELECT t.data, t.turno_inizio, t.turno_fine, t.user_id, t.note,
                   u.name, u.surname, u.telegram_chat_id
            FROM turni t
            JOIN users u ON t.user_id = u.id
            WHERE t.data = ? AND t.turno_inizio = ? AND t.turno_fine = ?
            AND u.telegram_chat_id IS NOT NULL`,
      args: [today, turnoInizio, turnoFine],
    });

    const utentiInTurno = turniResult.rows;
    console.log(
      `👥 Trovati ${utentiInTurno.length} utenti di turno da notificare`
    );

    if (utentiInTurno.length === 0) {
      console.log(
        `📊 Nessun utente di turno trovato per promemoria presenze ${fasciaOraria}`
      );
      return;
    }

    // Determina il messaggio da inviare
    const isAlreadyFilled = presenzeEsistenti.rows.length > 0;
    const numeroPresenze = isAlreadyFilled
      ? presenzeEsistenti.rows[0].numero_presenze
      : 0;

    let messageType;
    let messageIcon;

    if (isAlreadyFilled) {
      messageType = `Presenze già inserite: <b>${numeroPresenze}</b>`;
      messageIcon = "✅";
    } else {
      messageType = "<b>Presenze non ancora inserite</b>";
      messageIcon = "⚠️";
    }

    // Invia notifica solo agli utenti che sono di turno
    for (const utente of utentiInTurno) {
      try {
        const message = `${messageIcon} <b>Promemoria Presenze</b>

Ciao <b>${utente.name} ${utente.surname}</b>,

📊 Fascia oraria: <b>${fasciaOraria}</b>
📅 Data: <b>${formatDate(today)}</b>
${messageType}

${
  isAlreadyFilled
    ? "✅ Le presenze sono già state registrate per questa fascia."
    : "⚠️ Ricordati di inserire le presenze per questa fascia oraria nel sistema."
}

🔗 Accedi al sistema per gestire le presenze.

📋 Accedi al Google Sheets: ${GOOGLE_SHEETS_LINK}`;

        await sendTelegramMessage(utente.telegram_chat_id, message);

        // Piccola pausa tra i messaggi
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `❌ Errore invio promemoria presenze a ${utente.name} ${utente.surname}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("❌ Errore generale invio promemoria presenze:", error);
  }
}

// REPORT SETTIMANALE TURNI VUOTI - Sabato 12:00 (Versione Ottimizzata)
async function weeklyEmptyShiftsReport(timestamp) {
  try {
    if (!db) {
      const italianTime = getItalianTime();
      await sendTelegramMessage(
        TEST_CHAT_ID,
        `📋 Test Report Turni Vuoti\n⏰ ${italianTime.hour}:${italianTime.minute.toString().padStart(2, "0")} (orario italiano)`
      );
      return;
    }

    const italianTime = getItalianTime();
    console.log(
      `📋 Generando report turni vuoti (OTTIMIZZATO) per la prossima settimana`
    );
    const orariTemplate = [
      { inizio: "09:00", fine: "13:00", index: 0 }, // turno_index 0
      { inizio: "13:00", fine: "16:00", index: 1 }, // turno_index 1
      { inizio: "16:00", fine: "19:30", index: 2 }, // turno_index 2
      { inizio: "21:00", fine: "24:00", index: 3 }, // turno_index 3
    ]; // Ottieni le date della prossima settimana

    const weekOffset = 1; // prossima settimana
    const prossimaSettimana = getWeekDatesForOffset(weekOffset); // Calcola il lunedì della prossima settimana
    const monday = new Date(prossimaSettimana[0]); // <--- MODIFICA: Funzione di logica corretta
    // Riflette la logica della sundayEndTask (Lun-Ven, 09:00-19:30)

    const isSlotNaturallyClosed = (dayIndex, turnoIndex) => {
      // Sabato (5) o Domenica (6)
      // (dayIndex è 0-based: 0=Lunedì, 5=Sabato, 6=Domenica)
      if (dayIndex === 5 || dayIndex === 6) {
        return true;
      } // Turno serale (21:00-24:00, index 3)
      if (turnoIndex === 3) {
        return true;
      }
      return false;
    }; // <--- MODIFICA: Esegui UNA SOLA QUERY per tutti i turni

    console.log(
      `⚡ Eseguo query singola per tutti i turni dal ${prossimaSettimana[0]} al ${prossimaSettimana[6]}`
    );
    const turniEsistentiResult = await db.execute({
      sql: `SELECT data, turno_inizio, turno_fine 
            FROM turni 
            WHERE data >= ? AND data <= ?`,
      args: [prossimaSettimana[0], prossimaSettimana[6]],
    }); // <--- MODIFICA: Metti i turni in un Set per un controllo O(1) velocissimo

    const turniOccupati = new Set();
    turniEsistentiResult.rows.forEach((t) => {
      turniOccupati.add(`${t.data}_${t.turno_inizio}_${t.turno_fine}`);
    });
    console.log(
      `📊 Trovati ${turniOccupati.size} turni occupati nella prossima settimana`
    ); // Array per raccogliere i risultati

    let turniTeorici = [];
    let turniVuoti = [];
    let turniStraordinari = [];
    let totaleTurniOccupati = 0; // <--- MODIFICA: Elabora i dati IN MEMORIA (molto più veloce)

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dataGiorno = prossimaSettimana[dayIndex];
      const nomeGiorno = getDayName((dayIndex + 1) % 7); // 1=Lunedì, 0=Domenica

      for (
        let turnoIndex = 0;
        turnoIndex < orariTemplate.length;
        turnoIndex++
      ) {
        const orario = orariTemplate[turnoIndex];
        const keyTurno = `${dataGiorno}_${orario.inizio}_${orario.fine}`;
        const isClosed = isSlotNaturallyClosed(dayIndex, turnoIndex);
        const isOccupato = turniOccupati.has(keyTurno);

        if (isClosed) {
          // È uno slot "chiuso" (Sab/Dom/Sera)
          if (isOccupato) {
            // C'è un turno in uno slot chiuso = Straordinario
            turniStraordinari.push({
              data: dataGiorno,
              giorno: nomeGiorno,
              day_index: dayIndex,
              turno_index: turnoIndex,
              turno_inizio: orario.inizio,
              turno_fine: orario.fine,
            });
            totaleTurniOccupati++;
          }
        } else {
          // È uno slot "teorico" (Lun-Ven, 09:00-19:30)
          const turnoTeorico = {
            data: dataGiorno,
            giorno: nomeGiorno,
            day_index: dayIndex,
            turno_index: turnoIndex,
            turno_inizio: orario.inizio,
            turno_fine: orario.fine,
          };
          turniTeorici.push(turnoTeorico);

          if (isOccupato) {
            totaleTurniOccupati++;
          } else {
            // Turno teorico non occupato = Vuoto
            turniVuoti.push(turnoTeorico);
          }
        }
      }
    } // <--- MODIFICA: Query per admin e moderatori con GROUP BY
    // Questo RISOLVE IL PROBLEMA DEI MESSAGGI DOPPI

    const adminResult = await db.execute({
      sql: `SELECT id, name, surname, telegram_chat_id, level
            FROM users 
            WHERE telegram_chat_id IS NOT NULL AND (level = 0 OR level = 1)
            GROUP BY telegram_chat_id`,
      args: [],
    });

    const adminsAndModerators = adminResult.rows;

    if (adminsAndModerators.length === 0) {
      console.log("📋 Nessun admin o moderatore trovato per il report");
      return;
    } // Genera il messaggio del report

    let reportMessage = `📋 <b>Report Settimanale Turni Vuoti</b>

📅 Settimana: ${formatDate(prossimaSettimana[0])} - ${formatDate(prossimaSettimana[6])}
⏰ Generato: ${italianTime.hour}:${italianTime.minute.toString().padStart(2, "0")} (orario italiano)

📊 <b>Riepilogo:</b>
🔸 Turni totali teorici: <b>${turniTeorici.length}</b>
✅ Turni già occupati: <b>${totaleTurniOccupati - turniStraordinari.length}</b>
❌ Turni vuoti: <b>${turniVuoti.length}</b>`;

    if (turniStraordinari.length > 0) {
      reportMessage += `\n⭐ Turni straordinari: <b>${turniStraordinari.length}</b>`;
    }

    reportMessage += `\n\n`;

    if (turniVuoti.length === 0) {
      reportMessage += `🎉 <b>Ottimo!</b> Tutti i turni teorici della prossima settimana sono occupati!`;
    } else {
      reportMessage += `⚠️ <b>Turni vuoti da coprire:</b>\n\n`;
      const turniPerGiorno = {};
      turniVuoti.forEach((turno) => {
        if (!turniPerGiorno[turno.giorno]) {
          turniPerGiorno[turno.giorno] = [];
        }
        turniPerGiorno[turno.giorno].push(turno);
      });

      const giorniOrdinati = [
        "Lunedì",
        "Martedì",
        "Mercoledì",
        "Giovedì",
        "Venerdì",
        "Sabato",
        "Domenica",
      ];
      for (const giorno of giorniOrdinati) {
        if (turniPerGiorno[giorno]) {
          reportMessage += `📅 <b>${giorno}:</b>\n`;
          turniPerGiorno[giorno]
            .sort((a, b) => a.turno_index - b.turno_index)
            .forEach((turno) => {
              reportMessage += `   • ${turno.turno_inizio} - ${turno.turno_fine}\n`;
            });
          reportMessage += `\n`;
        }
      }
    }

    if (turniStraordinari.length > 0) {
      reportMessage += `\n⭐ <b>Turni Straordinari Attivi:</b>\n`;
      reportMessage += `<i>(Turni in slot che normalmente sarebbero chiusi)</i>\n\n`;
      const straordinariPerGiorno = {};
      turniStraordinari.forEach((turno) => {
        if (!straordinariPerGiorno[turno.giorno]) {
          straordinariPerGiorno[turno.giorno] = [];
        }
        straordinariPerGiorno[turno.giorno].push(turno);
      });

      const giorniOrdinati = [
        "Lunedì",
        "Martedì",
        "Mercoledì",
        "Giovedì",
        "Venerdì",
        "Sabato",
        "Domenica",
      ];
      for (const giorno of giorniOrdinati) {
        if (straordinariPerGiorno[giorno]) {
          reportMessage += `📅 <b>${giorno}:</b>\n`;
          straordinariPerGiorno[giorno]
            .sort((a, b) => a.turno_index - b.turno_index)
            .forEach((turno) => {
              reportMessage += `   ⭐ ${turno.turno_inizio} - ${turno.turno_fine}\n`;
            });
          reportMessage += `\n`;
        }
      }
    } // Invia il report (ora a utenti unici)

    for (const user of adminsAndModerators) {
      try {
        await sendTelegramMessage(user.telegram_chat_id, reportMessage);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `❌ Errore invio report a ${user.name} ${user.surname}:`,
          error
        );
      }
    }

    console.log(
      `📋 Report turni vuoti inviato a ${adminsAndModerators.length} utenti unici (admin/moderatori)`
    );
    console.log(`📊 Statistiche report (ottimizzato):
    - Turni teorici totali: ${turniTeorici.length}
    - Turni vuoti: ${turniVuoti.length}  
    - Turni occupati (teorici): ${totaleTurniOccupati - turniStraordinari.length}
    - Turni straordinari: ${turniStraordinari.length}`);
  } catch (error) {
    console.error("❌ Errore nel report turni vuoti (ottimizzato):", error);
    await sendTelegramMessage(
      TEST_CHAT_ID,
      `❌ Errore nel report turni vuoti (ottimizzato): ${error.message}`
    );
  }
}

// FUNZIONE CAMBIO SETTIMANA CON TRANSAZIONE - Domenica 23:59 (orario italiano)
// STRATEGIA: Salva -> Cancella -> Ricrea (TUTTO IN UNA TRANSAZIONE)
async function sundayEndTask(timestamp) {
  const italianTime = getItalianTime();
  console.log(
    `📊 Task fine domenica (23:59 orario italiano) - Avvio cambio settimana con TRANSAZIONE`
  ); // <--- MODIFICA: Variabili per il report definite fuori dalla transazione
  let deleteTurniCorrente = { rowsAffected: 0 };
  let orariCorrente = 0;
  let turniCorrente = 0;
  let orariProssima = 0;
  let turniProssima = 0;
  let verificaCorrente,
    verificaProssima,
    verificaTurniCorrente,
    verificaTurniProssima;
  let tx; // <--- MODIFICA: Dichiara la transazione qui

  try {
    if (!db) {
      await sendTelegramMessage(
        TEST_CHAT_ID,
        "⚠️ Database non disponibile per cambio settimana"
      );
      return;
    } // ========================================
    // FASE 1: CALCOLO DATE (fuori dalla transazione)
    // ========================================

    const settimanaCorrente = getWeekDatesForOffset(0);
    const settimana1 = getWeekDatesForOffset(1);
    const settimana2 = getWeekDatesForOffset(2);
    console.log(`\n🗓️ === CALCOLO DATE ===`);
    console.log(
      `🗑️ Settimana da eliminare: ${settimanaCorrente[0]} - ${settimanaCorrente[6]}`
    );
    console.log(
      `📅 Nuova corrente (era prossima): ${settimana1[0]} - ${settimana1[6]}`
    );
    console.log(
      `📅 Nuova prossima (nuova): ${settimana2[0]} - ${settimana2[6]}`
    ); // <--- MODIFICA: AVVIO BLOCCO TRY PER TRANSAZIONE

    try {
      // <--- MODIFICA: AVVIO TRANSAZIONE 'write'
      tx = await db.transaction("write");
      console.log("\n⚡ === TRANSAZIONE AVVIATA === ⚡"); // ========================================
      // FASE 2: SALVATAGGIO STATO ATTUALE (in transazione)
      // ========================================

      console.log(`\n💾 === SALVATAGGIO STATO ATTUALE ===`);
      const orariProssimaSalvati = await tx.execute({
        // <--- MODIFICA: tx.execute
        sql: `SELECT giorno, ora_inizio, ora_fine, note FROM fasce_orarie_prossima ORDER BY giorno, ora_inizio`,
        args: [],
      });
      console.log(
        `📋 Salvati ${orariProssimaSalvati.rows.length} orari da fasce_orarie_prossima`
      );

      const turniSettimana1Salvati = await tx.execute({
        // <--- MODIFICA: tx.execute
        sql: `SELECT data, turno_inizio, turno_fine, user_id, note, is_closed_override
               FROM turni
               WHERE data >= ? AND data <= ?
               ORDER BY data, turno_inizio`,
        args: [settimana1[0], settimana1[6]],
      });
      console.log(
        `📋 Salvati ${turniSettimana1Salvati.rows.length} turni della settimana 1`
      );

      const turniSettimana2Salvati = await tx.execute({
        // <--- MODIFICA: tx.execute
        sql: `SELECT data, turno_inizio, turno_fine, user_id, note, is_closed_override
               FROM turni
               WHERE data >= ? AND data <= ?
               ORDER BY data, turno_inizio`,
        args: [settimana2[0], settimana2[6]],
      });
      console.log(
        `📋 Salvati ${turniSettimana2Salvati.rows.length} turni della settimana 2`
      ); // ========================================
      // FASE 3: CANCELLAZIONE COMPLETA (in transazione)
      // ========================================

      console.log(`\n🗑️ === CANCELLAZIONE COMPLETA ===`);

      // FIX: Sgancia i turni storici dalle fasce orarie per evitare errori di Foreign Key
      await tx.execute({
        sql: `UPDATE turni SET fascia_id = NULL`,
        args: [],
      });
      console.log(
        `✅ Sganciati turni storici da fasce_orarie (fascia_id = NULL)`
      );

      deleteTurniCorrente = await tx.execute({
        // <--- MODIFICA: tx.execute
        sql: `DELETE FROM turni WHERE data >= ? AND data <= ?`,
        args: [settimanaCorrente[0], settimanaCorrente[6]],
      });
      console.log(
        `✅ Eliminati ${deleteTurniCorrente.rowsAffected} turni della settimana terminata`
      );

      const deleteTurniSettimana1 = await tx.execute({
        // <--- MODIFICA: tx.execute
        sql: `DELETE FROM turni WHERE data >= ? AND data <= ?`,
        args: [settimana1[0], settimana1[6]],
      });
      console.log(
        `✅ Eliminati ${deleteTurniSettimana1.rowsAffected} turni settimana 1 (verranno ricreati)`
      );

      const deleteTurniSettimana2 = await tx.execute({
        // <--- MODIFICA: tx.execute
        sql: `DELETE FROM turni WHERE data >= ? AND data <= ?`,
        args: [settimana2[0], settimana2[6]],
      });
      console.log(
        `✅ Eliminati ${deleteTurniSettimana2.rowsAffected} turni settimana 2 (verranno ricreati)`
      );

      await tx.execute({ sql: `DELETE FROM fasce_orarie`, args: [] }); // <--- MODIFICA: tx.execute
      console.log(`✅ Tabella fasce_orarie cancellata`);
      await tx.execute({ sql: `DELETE FROM fasce_orarie_prossima`, args: [] }); // <--- MODIFICA: tx.execute
      console.log(`✅ Tabella fasce_orarie_prossima cancellata`); // ========================================
      // FASE 4: RICOSTRUZIONE - ORARI CORRENTE (in transazione)
      // ========================================

      console.log(`\n🔄 === RICOSTRUZIONE ORARI CORRENTE ===`);
      for (const orario of orariProssimaSalvati.rows) {
        await tx.execute({
          // <--- MODIFICA: tx.execute
          sql: `INSERT INTO fasce_orarie (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?)`,
          args: [
            orario.giorno,
            orario.ora_inizio,
            orario.ora_fine,
            orario.note || null,
          ],
        });
        orariCorrente++; // <--- MODIFICA: aggiorna variabile esterna
      }
      console.log(`📊 Totale orari corrente creati: ${orariCorrente}`); // ========================================
      // FASE 5: RICOSTRUZIONE - TURNI SETTIMANA CORRENTE (in transazione)
      // ========================================

      console.log(`\n🔄 === RICOSTRUZIONE TURNI SETTIMANA CORRENTE ===`);
      for (const turno of turniSettimana1Salvati.rows) {
        await tx.execute({
          // <--- MODIFICA: tx.execute
          sql: `INSERT INTO turni (data, turno_inizio, turno_fine, fascia_id, user_id, note, is_closed_override) 
                  VALUES (?, ?, ?, NULL, ?, ?, ?)`,
          args: [
            turno.data,
            turno.turno_inizio,
            turno.turno_fine,
            turno.user_id,
            turno.note,
            turno.is_closed_override,
          ],
        });
        turniCorrente++; // <--- MODIFICA: aggiorna variabile esterna
      }
      console.log(
        `📊 Totale turni settimana corrente ricreati: ${turniCorrente}`
      ); // ========================================
      // FASE 6: RICOSTRUZIONE - ORARI PROSSIMA (standard) (in transazione)
      // ========================================

      console.log(`\n🆕 === RICOSTRUZIONE ORARI PROSSIMA (standard) ===`);
      const orariStandard = [
        { giorno: "Lunedì", ora_inizio: "09:00", ora_fine: "19:30" },
        { giorno: "Martedì", ora_inizio: "09:00", ora_fine: "19:30" },
        { giorno: "Mercoledì", ora_inizio: "09:00", ora_fine: "19:30" },
        { giorno: "Giovedì", ora_inizio: "09:00", ora_fine: "19:30" },
        { giorno: "Venerdì", ora_inizio: "09:00", ora_fine: "19:30" },
      ];

      for (const orario of orariStandard) {
        await tx.execute({
          // <--- MODIFICA: tx.execute
          sql: `INSERT INTO fasce_orarie_prossima (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?)`,
          args: [orario.giorno, orario.ora_inizio, orario.ora_fine, ""],
        });
        orariProssima++; // <--- MODIFICA: aggiorna variabile esterna
      }
      console.log(`📊 Totale orari prossima creati: ${orariProssima}`); // ========================================
      // FASE 7: RICOSTRUZIONE - TURNI SETTIMANA PROSSIMA (in transazione)
      // ========================================

      console.log(`\n🔄 === RICOSTRUZIONE TURNI SETTIMANA PROSSIMA ===`);
      for (const turno of turniSettimana2Salvati.rows) {
        await tx.execute({
          // <--- MODIFICA: tx.execute
          sql: `INSERT INTO turni (data, turno_inizio, turno_fine, fascia_id, user_id, note, is_closed_override) 
                  VALUES (?, ?, ?, NULL, ?, ?, ?)`,
          args: [
            turno.data,
            turno.turno_inizio,
            turno.turno_fine,
            turno.user_id,
            turno.note,
            turno.is_closed_override,
          ],
        });
        turniProssima++; // <--- MODIFICA: aggiorna variabile esterna
      }
      console.log(
        `📊 Totale turni settimana prossima ricreati: ${turniProssima}`
      ); // ========================================
      // FASE 8: VERIFICA FINALE (in transazione)
      // ========================================

      console.log(`\n🔍 === VERIFICA FINALE ===`);
      verificaCorrente = await tx.execute({
        // <--- MODIFICA: tx.execute
        sql: `SELECT COUNT(*) as count FROM fasce_orarie`,
        args: [],
      });
      verificaProssima = await tx.execute({
        // <--- MODIFICA: tx.execute
        sql: `SELECT COUNT(*) as count FROM fasce_orarie_prossima`,
        args: [],
      });
      verificaTurniCorrente = await tx.execute({
        // <--- MODIFICA: tx.execute
        sql: `SELECT COUNT(*) as count FROM turni WHERE data >= ? AND data <= ?`,
        args: [settimana1[0], settimana1[6]],
      });
      verificaTurniProssima = await tx.execute({
        // <--- MODIFICA: tx.execute
        sql: `SELECT COUNT(*) as count FROM turni WHERE data >= ? AND data <= ?`,
        args: [settimana2[0], settimana2[6]],
      });

      console.log(`✅ Orari corrente: ${verificaCorrente.rows[0].count}`);
      console.log(`✅ Orari prossima: ${verificaProssima.rows[0].count}`);
      console.log(
        `✅ Turni settimana corrente: ${verificaTurniCorrente.rows[0].count}`
      );
      console.log(
        `✅ Turni settimana prossima: ${verificaTurniProssima.rows[0].count}`
      ); // <--- MODIFICA: COMMIT DELLA TRANSAZIONE

      await tx.commit();
      console.log("\n✅ === TRANSAZIONE COMPLETATA (COMMIT ESEGUITO) === ✅");
    } catch (txError) {
      // <--- MODIFICA: CATTURA ERRORE TRANSAZIONE
      console.error(
        "❌ ERRORE DURANTE LA TRANSAZIONE, ESEGUO ROLLBACK...",
        txError
      );
      if (tx) {
        await tx.rollback();
        console.log(
          "🔄 === ROLLBACK COMPLETATO. Nessuna modifica al database. === 🔄"
        );
      }
      throw txError; // Rilancia l'errore per il blocco catch esterno
    } // ========================================
    // FASE 9: NOTIFICA ADMIN (solo se la transazione ha avuto successo)
    // ========================================
    console.log(`\n📨 === INVIO NOTIFICHE ===`); // <--- MODIFICA: Ora usa db.execute, la transazione è chiusa
    const adminResult = await db.execute({
      sql: `SELECT id, name, surname, telegram_chat_id, level
            FROM users 
            WHERE telegram_chat_id IS NOT NULL AND level = 0`,
      args: [],
    });

    const summary = `🔄 <b>Cambio Settimana Completato</b>
📋 <i>Rotazione Semplificata (2 settimane)</i>

📅 Settimana terminata: ${formatDate(settimanaCorrente[0])} - ${formatDate(settimanaCorrente[6])}
⏰ Eseguito alle: ${italianTime.hour}:${italianTime.minute.toString().padStart(2, "0")} (orario italiano)

📊 <b>Operazioni eseguite:</b>
🗑️ Turni eliminati (settimana terminata): <b>${deleteTurniCorrente.rowsAffected}</b>

🔄 <b>Rotazione completata:</b>
📋 Orari corrente: <b>${orariCorrente}</b> fasce create
🔗 Turni corrente: <b>${turniCorrente}</b> turni ricreati
🆕 Orari prossima: <b>${orariProssima}</b> fasce standard create
📅 Turni prossima: <b>${turniProssima}</b> turni ricreati

🔍 <b>Verifica finale:</b>
• Settimana Corrente: <b>${verificaTurniCorrente.rows[0].count}</b> turni
• Settimana Prossima: <b>${verificaTurniProssima.rows[0].count}</b> turni

📋 <b>Orari standard settimana prossima:</b>
• Lunedì-Venerdì: 09:00-19:30
• Sabato e Domenica: Chiuso

✅ Sistema pronto per la nuova settimana!
🎯 Transazione completata con successo.`;

    let notificheInviate = 0;
    for (const admin of adminResult.rows) {
      try {
        await sendTelegramMessage(admin.telegram_chat_id, summary);
        notificheInviate++;
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `❌ Errore invio notifica a ${admin.name} ${admin.surname}:`,
          error
        );
      }
    }

    console.log(`✅ Notifiche inviate a ${notificheInviate} admin`); // Log nel database

    await db
      .execute({
        sql: `INSERT INTO cron_logs (task_type, executed_at, status, error_message) VALUES (?, ?, ?, ?)`,
        args: [
          "week_change_simplified",
          timestamp.toISOString(),
          "success",
          `Turni eliminati: ${deleteTurniCorrente.rowsAffected}, Turni corrente: ${turniCorrente}, Turni prossima: ${turniProssima}, Orari: ${orariCorrente}+${orariProssima}, Notifiche: ${notificheInviate}`,
        ],
      })
      .catch((error) => {
        console.error("Errore log database:", error);
      });

    console.log(`\n✅ === CAMBIO SETTIMANA COMPLETATO CON SUCCESSO ===\V`);
  } catch (error) {
    // <--- MODIFICA: Questo è il blocco catch esterno
    console.error("❌ ERRORE CRITICO NEL CAMBIO SETTIMANA:", error);
    const errorMessage = `❌ <b>Errore Cambio Settimana</b>
📋 <i>Rotazione Semplificata</i>
      
⏰ Domenica 23:59 (orario italiano)
🚨 Errore: ${error.message}

⚠️ <b>ROLLBACK ESEGUITO.</b> Il cambio settimana NON è stato effettuato.
Il database è stato ripristinato allo stato precedente all'avvio del task.

📋 <b>Azione richiesta:</b>
• Verificare il log per l'errore.
• Il sistema è ancora alla settimana precedente.
• Contattare il supporto tecnico.`; // Notifica admin dell'errore

    if (db) {
      try {
        const adminResult = await db.execute({
          sql: `SELECT telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL AND level = 0`,
          args: [],
        });

        for (const admin of adminResult.rows) {
          try {
            await sendTelegramMessage(admin.telegram_chat_id, errorMessage);
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (err) {
            console.error("Errore invio notifica errore:", err);
          }
        }
      } catch (dbError) {
        console.error("Errore accesso DB per notifica errore:", dbError);
      }
    }

    await sendTelegramMessage(TEST_CHAT_ID, errorMessage);
    throw error; // Rilancia l'errore per Vercel
  }
}
// Task generale per test e chiamate non programmate
async function generalTask(timestamp) {
  const italianTime = getItalianTime();
  console.log("🔧 Task generale eseguito");

  const message = `🔧 Task Generale Eseguito
⏰ Orario: ${italianTime.hour}:${italianTime.minute.toString().padStart(2, "0")} (🇮🇹 ITALIA)
📅 Data: ${italianTime.date.toLocaleDateString("it-IT")}
🚀 Il sistema funziona!

Chiamata ricevuta correttamente.
🌍 Fuso orario: Europe/Rome`;

  await sendTelegramMessage(TEST_CHAT_ID, message);
}

// Funzioni di supporto
async function logExecution(taskType, timestamp, status, errorMessage = null) {
  try {
    if (db) {
      await db.execute({
        sql: `INSERT INTO cron_logs (task_type, executed_at, status, error_message) VALUES (?, ?, ?, ?)`,
        args: [taskType, timestamp.toISOString(), status, errorMessage],
      });
    }
    console.log(`📝 Log esecuzione salvato: ${taskType} - ${status}`);
  } catch (error) {
    console.error("❌ Errore salvataggio log:", error);
  }
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDayName(dayIndex) {
  const days = [
    "Domenica",
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
  ];
  return days[dayIndex];
}

export default async function handler(request, response) {
  // SICUREZZA: Richiede ?run=true nell'URL per eseguire
  const { searchParams } = new URL(request.url);
  const shouldRun = searchParams.get("run");

  if (shouldRun !== "true") {
    return response.status(400).json({
      message:
        "Modalità test. Aggiungi ?run=true all'URL per eseguire realmente il cambio settimana.",
      warning: "Questa operazione MODIFICA il database.",
    });
  }

  // Simuliamo il timestamp che verrebbe passato dal cron job
  const timestamp = new Date();

  const italianTime = getItalianTime();
  console.log(
    `📊 Task fine domenica (TEST MANUALE) - Avvio cambio settimana con TRANSAZIONE`
  );

  let deleteTurniCorrente = { rowsAffected: 0 };
  let orariCorrente = 0;
  let turniCorrente = 0;
  let orariProssima = 0;
  let turniProssima = 0;
  let verificaCorrente,
    verificaProssima,
    verificaTurniCorrente,
    verificaTurniProssima;
  let tx;

  try {
    if (!db) {
      await sendTelegramMessage(
        TEST_CHAT_ID,
        "⚠️ Database non disponibile per cambio settimana (TEST)"
      );
      return response.status(500).json({ error: "Database non disponibile" });
    }

    // ========================================
    // FASE 1: CALCOLO DATE (fuori dalla transazione)
    // ========================================

    const settimanaCorrente = getWeekDatesForOffset(0);
    const settimana1 = getWeekDatesForOffset(1);
    const settimana2 = getWeekDatesForOffset(2);

    // Log per debug HTTP
    const debugLogs = [];
    const log = (msg) => {
      console.log(msg);
      debugLogs.push(msg);
    };

    log(`\n🗓️ === CALCOLO DATE ===`);
    log(
      `🗑️ Settimana da eliminare: ${settimanaCorrente[0]} - ${settimanaCorrente[6]}`
    );
    log(
      `📅 Nuova corrente (era prossima): ${settimana1[0]} - ${settimana1[6]}`
    );
    log(`📅 Nuova prossima (nuova): ${settimana2[0]} - ${settimana2[6]}`);

    try {
      // <--- AVVIO TRANSAZIONE 'write'
      tx = await db.transaction("write");
      log("\n⚡ === TRANSAZIONE AVVIATA === ⚡");

      // ========================================
      // FASE 2: SALVATAGGIO STATO ATTUALE (in transazione)
      // ========================================

      log(`\n💾 === SALVATAGGIO STATO ATTUALE ===`);
      const orariProssimaSalvati = await tx.execute({
        sql: `SELECT giorno, ora_inizio, ora_fine, note FROM fasce_orarie_prossima ORDER BY giorno, ora_inizio`,
        args: [],
      });
      log(
        `📋 Salvati ${orariProssimaSalvati.rows.length} orari da fasce_orarie_prossima`
      );

      const turniSettimana1Salvati = await tx.execute({
        sql: `SELECT data, turno_inizio, turno_fine, user_id, note, is_closed_override
               FROM turni
               WHERE data >= ? AND data <= ?
               ORDER BY data, turno_inizio`,
        args: [settimana1[0], settimana1[6]],
      });
      log(
        `📋 Salvati ${turniSettimana1Salvati.rows.length} turni della settimana 1`
      );

      const turniSettimana2Salvati = await tx.execute({
        sql: `SELECT data, turno_inizio, turno_fine, user_id, note, is_closed_override
               FROM turni
               WHERE data >= ? AND data <= ?
               ORDER BY data, turno_inizio`,
        args: [settimana2[0], settimana2[6]],
      });
      log(
        `📋 Salvati ${turniSettimana2Salvati.rows.length} turni della settimana 2`
      );

      // ========================================
      // FASE 3: CANCELLAZIONE COMPLETA (in transazione)
      // ========================================

      log(`\n🗑️ === CANCELLAZIONE COMPLETA ===`);

      await tx.execute({
        sql: `UPDATE turni SET fascia_id = NULL`,
        args: [],
      });
      log(`✅ Sganciati turni storici da fasce_orarie (fascia_id = NULL)`);

      deleteTurniCorrente = await tx.execute({
        sql: `DELETE FROM turni WHERE data >= ? AND data <= ?`,
        args: [settimanaCorrente[0], settimanaCorrente[6]],
      });
      log(
        `✅ Eliminati ${deleteTurniCorrente.rowsAffected} turni della settimana terminata`
      );

      const deleteTurniSettimana1 = await tx.execute({
        sql: `DELETE FROM turni WHERE data >= ? AND data <= ?`,
        args: [settimana1[0], settimana1[6]],
      });
      log(
        `✅ Eliminati ${deleteTurniSettimana1.rowsAffected} turni settimana 1 (verranno ricreati)`
      );

      const deleteTurniSettimana2 = await tx.execute({
        sql: `DELETE FROM turni WHERE data >= ? AND data <= ?`,
        args: [settimana2[0], settimana2[6]],
      });
      log(
        `✅ Eliminati ${deleteTurniSettimana2.rowsAffected} turni settimana 2 (verranno ricreati)`
      );

      await tx.execute({ sql: `DELETE FROM fasce_orarie`, args: [] });
      log(`✅ Tabella fasce_orarie cancellata`);
      await tx.execute({ sql: `DELETE FROM fasce_orarie_prossima`, args: [] });
      log(`✅ Tabella fasce_orarie_prossima cancellata`);

      // ========================================
      // FASE 4: RICOSTRUZIONE - ORARI CORRENTE (in transazione)
      // ========================================

      log(`\n🔄 === RICOSTRUZIONE ORARI CORRENTE ===`);
      for (const orario of orariProssimaSalvati.rows) {
        await tx.execute({
          sql: `INSERT INTO fasce_orarie (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?)`,
          args: [
            orario.giorno,
            orario.ora_inizio,
            orario.ora_fine,
            orario.note || null,
          ],
        });
        orariCorrente++;
      }
      log(`📊 Totale orari corrente creati: ${orariCorrente}`);

      // ========================================
      // FASE 5: RICOSTRUZIONE - TURNI SETTIMANA CORRENTE (in transazione)
      // ========================================

      log(`\n🔄 === RICOSTRUZIONE TURNI SETTIMANA CORRENTE ===`);
      for (const turno of turniSettimana1Salvati.rows) {
        await tx.execute({
          sql: `INSERT INTO turni (data, turno_inizio, turno_fine, fascia_id, user_id, note, is_closed_override) 
                  VALUES (?, ?, ?, NULL, ?, ?, ?)`,
          args: [
            turno.data,
            turno.turno_inizio,
            turno.turno_fine,
            turno.user_id,
            turno.note,
            turno.is_closed_override,
          ],
        });
        turniCorrente++;
      }
      log(`📊 Totale turni settimana corrente ricreati: ${turniCorrente}`);

      // ========================================
      // FASE 6: RICOSTRUZIONE - ORARI PROSSIMA (standard) (in transazione)
      // ========================================

      log(`\n🆕 === RICOSTRUZIONE ORARI PROSSIMA (standard) ===`);
      const orariStandard = [
        { giorno: "Lunedì", ora_inizio: "09:00", ora_fine: "19:30" },
        { giorno: "Martedì", ora_inizio: "09:00", ora_fine: "19:30" },
        { giorno: "Mercoledì", ora_inizio: "09:00", ora_fine: "19:30" },
        { giorno: "Giovedì", ora_inizio: "09:00", ora_fine: "19:30" },
        { giorno: "Venerdì", ora_inizio: "09:00", ora_fine: "19:30" },
      ];

      for (const orario of orariStandard) {
        await tx.execute({
          sql: `INSERT INTO fasce_orarie_prossima (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?)`,
          args: [orario.giorno, orario.ora_inizio, orario.ora_fine, ""],
        });
        orariProssima++;
      }
      log(`📊 Totale orari prossima creati: ${orariProssima}`);

      // ========================================
      // FASE 7: RICOSTRUZIONE - TURNI SETTIMANA PROSSIMA (in transazione)
      // ========================================

      log(`\n🔄 === RICOSTRUZIONE TURNI SETTIMANA PROSSIMA ===`);
      for (const turno of turniSettimana2Salvati.rows) {
        await tx.execute({
          sql: `INSERT INTO turni (data, turno_inizio, turno_fine, fascia_id, user_id, note, is_closed_override) 
                  VALUES (?, ?, ?, NULL, ?, ?, ?)`,
          args: [
            turno.data,
            turno.turno_inizio,
            turno.turno_fine,
            turno.user_id,
            turno.note,
            turno.is_closed_override,
          ],
        });
        turniProssima++;
      }
      log(`📊 Totale turni settimana prossima ricreati: ${turniProssima}`);

      // ========================================
      // FASE 8: VERIFICA FINALE (in transazione)
      // ========================================

      log(`\n🔍 === VERIFICA FINALE ===`);
      verificaCorrente = await tx.execute({
        sql: `SELECT COUNT(*) as count FROM fasce_orarie`,
        args: [],
      });
      verificaProssima = await tx.execute({
        sql: `SELECT COUNT(*) as count FROM fasce_orarie_prossima`,
        args: [],
      });
      verificaTurniCorrente = await tx.execute({
        sql: `SELECT COUNT(*) as count FROM turni WHERE data >= ? AND data <= ?`,
        args: [settimana1[0], settimana1[6]],
      });
      verificaTurniProssima = await tx.execute({
        sql: `SELECT COUNT(*) as count FROM turni WHERE data >= ? AND data <= ?`,
        args: [settimana2[0], settimana2[6]],
      });

      log(`✅ Orari corrente: ${verificaCorrente.rows[0].count}`);
      log(`✅ Orari prossima: ${verificaProssima.rows[0].count}`);
      log(
        `✅ Turni settimana corrente: ${verificaTurniCorrente.rows[0].count}`
      );
      log(
        `✅ Turni settimana prossima: ${verificaTurniProssima.rows[0].count}`
      );

      // <--- COMMIT DELLA TRANSAZIONE
      await tx.commit();
      log("\n✅ === TRANSAZIONE COMPLETATA (COMMIT ESEGUITO) === ✅");
    } catch (txError) {
      console.error(
        "❌ ERRORE DURANTE LA TRANSAZIONE, ESEGUO ROLLBACK...",
        txError
      );
      if (tx) {
        await tx.rollback();
        log("🔄 === ROLLBACK COMPLETATO. Nessuna modifica al database. === 🔄");
      }
      throw txError;
    }

    // ========================================
    // FASE 9: NOTIFICA ADMIN
    // ========================================
    log(`\n📨 === INVIO NOTIFICHE ===`);
    const adminResult = await db.execute({
      sql: `SELECT id, name, surname, telegram_chat_id, level
            FROM users 
            WHERE telegram_chat_id IS NOT NULL AND level = 0`,
      args: [],
    });

    const summary = `🔄 <b>Cambio Settimana Completato (TEST MANUALE)</b>
📋 <i>Rotazione Semplificata (2 settimane)</i>

📅 Settimana terminata: ${formatDate(settimanaCorrente[0])} - ${formatDate(settimanaCorrente[6])}
⏰ Eseguito alle: ${italianTime.hour}:${italianTime.minute.toString().padStart(2, "0")} (orario italiano)

📊 <b>Operazioni eseguite:</b>
🗑️ Turni eliminati (settimana terminata): <b>${deleteTurniCorrente.rowsAffected}</b>

🔄 <b>Rotazione completata:</b>
📋 Orari corrente: <b>${orariCorrente}</b> fasce create
🔗 Turni corrente: <b>${turniCorrente}</b> turni ricreati
🆕 Orari prossima: <b>${orariProssima}</b> fasce standard create
📅 Turni prossima: <b>${turniProssima}</b> turni ricreati

🔍 <b>Verifica finale:</b>
• Settimana Corrente: <b>${verificaTurniCorrente.rows[0].count}</b> turni
• Settimana Prossima: <b>${verificaTurniProssima.rows[0].count}</b> turni

✅ Sistema pronto!
🎯 Transazione completata con successo.`;

    let notificheInviate = 0;
    for (const admin of adminResult.rows) {
      try {
        await sendTelegramMessage(admin.telegram_chat_id, summary);
        notificheInviate++;
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Errore invio notifica a admin:`, error);
      }
    }

    log(`✅ Notifiche inviate a ${notificheInviate} admin`);

    // Log nel DB
    await db
      .execute({
        sql: `INSERT INTO cron_logs (task_type, executed_at, status, error_message) VALUES (?, ?, ?, ?)`,
        args: [
          "week_change_manual_test",
          timestamp.toISOString(),
          "success",
          `TEST MANUALE VIA API. Turni eliminati: ${deleteTurniCorrente.rowsAffected}, Turni corrente: ${turniCorrente}`,
        ],
      })
      .catch((error) => console.error("Errore log database:", error));

    // RISPOSTA POSITIVA AL BROWSER
    return response.status(200).json({
      success: true,
      message: "Cambio settimana completato con successo",
      logs: debugLogs,
      stats: {
        deleted: deleteTurniCorrente.rowsAffected,
        currentCreated: turniCorrente,
        nextCreated: turniProssima,
      },
    });
  } catch (error) {
    // GESTIONE ERRORE ESTERNA
    console.error("❌ ERRORE CRITICO NEL CAMBIO SETTIMANA:", error);

    // Notifica Telegram di Errore
    const errorMessage = `❌ <b>Errore Cambio Settimana (TEST MANUALE)</b>
🚨 Errore: ${error.message}
⚠️ <b>ROLLBACK ESEGUITO.</b>`;

    if (db) {
      try {
        await sendTelegramMessage(TEST_CHAT_ID, errorMessage);
      } catch (e) {
        console.error(e);
      }
    }

    // RISPOSTA NEGATIVA AL BROWSER
    return response.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}
