// api/cron.js
import { createClient } from '@libsql/client/web';
import { Resend } from 'resend';

// Inizializza i client (usa le variabili d'ambiente di Vercel)
const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim()
};

let db = null;
if (config.url && config.authToken) {
  db = createClient(config);
} else {
  console.warn('⚠️ Database config mancante, alcune funzioni potrebbero non funzionare');
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Configurazione Telegram
const TELEGRAM_BOT_TOKEN = '7608037480:AAGkJbIf02G98dTEnREBhfjI2yna5-Y1pzc';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TEST_CHAT_ID = '1129901266'; // Chat ID per i test

// Link Google Sheets per le presenze
const GOOGLE_SHEETS_LINK = 'https://docs.google.com/spreadsheets/d/1JO-0aETjC09KJk-RptMsdc1CXnilvP6z/edit?gid=887368033#gid=887368033';

// FUNZIONE PER OTTENERE L'ORARIO ITALIANO
function getItalianTime() {
  const now = new Date();
  
  // Crea un oggetto Date per il fuso orario italiano
  const italianTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
  
  return {
    date: italianTime,
    hour: italianTime.getHours(),
    minute: italianTime.getMinutes(),
    day: italianTime.getDay(), // 0 = Domenica, 1 = Lunedì, etc.
    dateString: italianTime.toISOString().split('T')[0] // YYYY-MM-DD
  };
}

export default async function handler(req, res) {
  // Accetta sia GET che POST per test
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
  }

  // Usa l'orario italiano invece di quello del server
  const italianTime = getItalianTime();
  const { date: now, hour: currentHour, minute: currentMinute, day: currentDay } = italianTime;
  
  console.log(`🕐 Cron job eseguito alle ${currentHour}:${currentMinute.toString().padStart(2, '0')} del ${getDayName(currentDay)} (orario italiano)`);

  try {
    // Determina il task in base all'orario attuale ITALIANO
    const taskType = determineTaskType(currentHour, currentMinute, currentDay);
    
    if (taskType) {
      await handleTask(taskType, now);
      await logExecution(taskType, now, 'success');
      
      return res.status(200).json({ 
        message: 'Cron job completato con successo',
        taskType: taskType,
        timestamp: now.toISOString(),
        italianTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
        executed: true
      });
    } else {
      // Esegui comunque un task di default per i test
      await handleTask('general_task', now);
      
      return res.status(200).json({ 
        message: 'Task generale eseguito',
        taskType: 'general_task',
        timestamp: now.toISOString(),
        italianTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
        executed: true
      });
    }

  } catch (error) {
    console.error('❌ Errore nel cron job:', error);
    
    await logExecution('error_task', now, 'error', error.message).catch(() => {});
    
    return res.status(500).json({ 
      error: 'Errore interno del server',
      timestamp: now.toISOString(),
      italianTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
      details: error.message
    });
  }
}

// FUNZIONE CORRETTA - Sostituire nel file api/cron.js

function determineTaskType(hour, minute, day) {
  console.log(`🔍 CRON DEBUG: hour=${hour}, minute=${minute}, day=${day} (${getDayName(day)})`);
  
  // PROMEMORIA TURNI
  if (hour === 8 && minute === 0) {
    return 'reminder_morning'; // Promemoria turni 9:00-13:00
  }
  
  // PRIORITÀ AL REPORT SETTIMANALE - Sabato 12:00 
  if (hour === 12 && minute === 0 && day === 6) {
    console.log('📋 Sabato 12:00 - Eseguendo weekly_empty_shifts_report');
    return 'weekly_empty_shifts_report';
  }
  
  // PROMEMORIA TURNI 
  if (hour === 12 && minute === 0) {
    console.log('🔔 Altri giorni 12:00 - Eseguendo reminder_early_afternoon');
    return 'reminder_early_afternoon'; // Promemoria turni 13:00-16:00
  }
  
  if (hour === 15 && minute === 0) {
    return 'reminder_late_afternoon'; // Promemoria turni 16:00-19:30
  }
  
  if (hour === 20 && minute === 30) {
    return 'reminder_evening'; // Promemoria turni 21:00-24:00
  }
  
  // PROMEMORIA PRESENZE
  if (hour === 12 && minute === 30) {
    return 'reminder_presenze_9_13'; // Promemoria riempire presenze 9-13
  }
  
  if (hour === 15 && minute === 30) {
    return 'reminder_presenze_13_16'; // Promemoria riempire presenze 13-16
  }
  
  if (hour === 19 && minute === 0) {
    return 'reminder_presenze_16_19'; // Promemoria riempire presenze 16-19:30
  }
  
  if (hour === 23 && minute === 30) {
    return 'reminder_presenze_21_24'; // Promemoria riempire presenze 21-24
  }
  
  // CAMBIO SETTIMANA - Domenica 23:59 (orario italiano)
  if (hour === 23 && minute === 59 && day === 0) {
    return 'sunday_end_task';
  }
  
  return null;
}

// Funzione principale per gestire i diversi task
async function handleTask(taskType, timestamp) {
  const italianTime = getItalianTime();
  console.log(`🚀 Eseguendo task: ${taskType} alle ${italianTime.hour}:${italianTime.minute.toString().padStart(2, '0')} (orario italiano)`);
  
  switch (taskType) {
    case 'reminder_morning':
      await sendTurnoReminders('09:00', '13:00', timestamp);
      break;
      
    case 'reminder_early_afternoon':
      await sendTurnoReminders('13:00', '16:00', timestamp);
      break;
      
    case 'reminder_late_afternoon':
      await sendTurnoReminders('16:00', '19:30', timestamp);
      break;
      
    case 'reminder_evening':
      await sendTurnoReminders('21:00', '24:00', timestamp);
      break;
      
    case 'reminder_presenze_9_13':
      await sendPresenzeReminderToShifts('9-13', '09:00', '13:00', timestamp);
      break;
      
    case 'reminder_presenze_13_16':
      await sendPresenzeReminderToShifts('13-16', '13:00', '16:00', timestamp);
      break;
      
    case 'reminder_presenze_16_19':
      await sendPresenzeReminderToShifts('16-19:30', '16:00', '19:30', timestamp);
      break;
      
    case 'reminder_presenze_21_24':
      await sendPresenzeReminderToShifts('21-24', '21:00', '24:00', timestamp);
      break;
      
    case 'weekly_empty_shifts_report':
      await weeklyEmptyShiftsReport(timestamp);
      break;
      
    case 'sunday_end_task':
      await sundayEndTask(timestamp);
      break;
      
    case 'general_task':
      await generalTask(timestamp);
      break;
      
    default:
      console.log('⚠️ Task non riconosciuto:', taskType);
      await generalTask(timestamp);
  }
}

// Funzione per ottenere le date di una settimana specifica
function getWeekDatesForOffset(weekOffset = 0) {
  const italianTime = getItalianTime();
  const now = italianTime.date;
  const currentDay = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + (weekOffset * 7));
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date.toISOString().split('T')[0]);
  }
  return weekDates;
}

// Funzione per inviare messaggi Telegram
async function sendTelegramMessage(chatId, message) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.description || 'Errore nell\'invio del messaggio');
    }
    
    console.log('✅ Messaggio Telegram inviato con successo');
    return data.result;
  } catch (error) {
    console.error('❌ Errore invio messaggio Telegram:', error);
    throw error;
  }
}

// FUNZIONE PRINCIPALE: Invia promemoria turni
async function sendTurnoReminders(turnoInizio, turnoFine, timestamp) {
  try {
    if (!db) {
      const italianTime = getItalianTime();
      console.log('⚠️ Database non disponibile, invio messaggio di test');
      await sendTelegramMessage(TEST_CHAT_ID, 
        `🔔 Test Promemoria Turni ${turnoInizio}-${turnoFine}\n⏰ ${italianTime.hour}:${italianTime.minute.toString().padStart(2, '0')} (orario italiano)`);
      return;
    }

    // Ottieni la data di oggi (italiana)
    const italianTime = getItalianTime();
    const today = italianTime.dateString;
    
    console.log(`📋 Cercando turni per oggi ${today} dalle ${turnoInizio} alle ${turnoFine}`);
    
    // Query per ottenere tutti i turni di oggi per questa fascia oraria
    const result = await db.execute({
      sql: `SELECT t.data, t.turno_inizio, t.turno_fine, t.user_id, t.note,
                   u.name, u.surname, u.telegram_chat_id
            FROM turni t
            JOIN users u ON t.user_id = u.id
            WHERE t.data = ? AND t.turno_inizio = ? AND t.turno_fine = ?
            AND u.telegram_chat_id IS NOT NULL`,
      args: [today, turnoInizio, turnoFine]
    });

    const turni = result.rows;
    console.log(`📊 Trovati ${turni.length} turni per la fascia ${turnoInizio}-${turnoFine}`);

    if (turni.length === 0) {
      console.log(`📋 Nessun turno trovato per la fascia ${turnoInizio}-${turnoFine}`);
      return;
    }

    // Invia promemoria a ogni persona in turno
    for (const turno of turni) {
      try {
        const message = `🔔 <b>Promemoria Turno</b>

Ciao <b>${turno.name} ${turno.surname}</b>, ti ricordo il tuo turno di oggi orario <b>${turno.turno_inizio}-${turno.turno_fine}</b> in aula studio foro.

📅 Data: ${formatDate(turno.data)}
⏰ Orario: ${turno.turno_inizio} - ${turno.turno_fine}
${turno.note ? `📝 Note: ${turno.note}` : ''}

Buono Studio! 💪`;

        await sendTelegramMessage(turno.telegram_chat_id, message);
        
        // Piccola pausa tra i messaggi
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Errore invio promemoria a ${turno.name} ${turno.surname}:`, error);
      }
    }

  } catch (error) {
    console.error('❌ Errore generale invio promemoria:', error);
  }
}

// FUNZIONE PER PROMEMORIA PRESENZE - Solo a chi è di turno (CON LINK SHEETS)
async function sendPresenzeReminderToShifts(fasciaOraria, turnoInizio, turnoFine, timestamp) {
  try {
    if (!db) {
      const italianTime = getItalianTime();
      console.log('⚠️ Database non disponibile, invio messaggio di test');
      await sendTelegramMessage(TEST_CHAT_ID, 
        `📊 Test Promemoria Presenze ${fasciaOraria}\n⏰ ${italianTime.hour}:${italianTime.minute.toString().padStart(2, '0')} (orario italiano)\n\n📋 Accedi al Google Sheets: ${GOOGLE_SHEETS_LINK}`);
      return;
    }

    // Ottieni la data di oggi (italiana)
    const italianTime = getItalianTime();
    const today = italianTime.dateString;
    
    console.log(`📊 Promemoria presenze per la fascia ${fasciaOraria} del ${today}`);
    
    // Verifica se le presenze per oggi sono già state inserite
    const presenzeEsistenti = await db.execute({
      sql: `SELECT numero_presenze FROM presenze WHERE data = ? AND fascia_oraria = ?`,
      args: [today, fasciaOraria]
    });

    // Ottieni solo gli utenti che sono di turno in questa fascia oraria
    const turniResult = await db.execute({
      sql: `SELECT t.data, t.turno_inizio, t.turno_fine, t.user_id, t.note,
                   u.name, u.surname, u.telegram_chat_id
            FROM turni t
            JOIN users u ON t.user_id = u.id
            WHERE t.data = ? AND t.turno_inizio = ? AND t.turno_fine = ?
            AND u.telegram_chat_id IS NOT NULL`,
      args: [today, turnoInizio, turnoFine]
    });

    const utentiInTurno = turniResult.rows;
    console.log(`👥 Trovati ${utentiInTurno.length} utenti di turno da notificare`);

    if (utentiInTurno.length === 0) {
      console.log(`📊 Nessun utente di turno trovato per promemoria presenze ${fasciaOraria}`);
      return;
    }

    // Determina il messaggio da inviare
    const isAlreadyFilled = presenzeEsistenti.rows.length > 0;
    const numeroPresenze = isAlreadyFilled ? presenzeEsistenti.rows[0].numero_presenze : 0;

    let messageType;
    let messageIcon;
    
    if (isAlreadyFilled) {
      messageType = `Presenze già inserite: <b>${numeroPresenze}</b>`;
      messageIcon = '✅';
    } else {
      messageType = '<b>Presenze non ancora inserite</b>';
      messageIcon = '⚠️';
    }

    // Invia notifica solo agli utenti che sono di turno
    for (const utente of utentiInTurno) {
      try {
        const message = `${messageIcon} <b>Promemoria Presenze</b>

Ciao <b>${utente.name} ${utente.surname}</b>,

📊 Fascia oraria: <b>${fasciaOraria}</b>
📅 Data: <b>${formatDate(today)}</b>
${messageType}

${isAlreadyFilled ? 
  '✅ Le presenze sono già state registrate per questa fascia.' : 
  '⚠️ Ricordati di inserire le presenze per questa fascia oraria nel sistema.'
}

🔗 Accedi al sistema per gestire le presenze.

📋 Accedi al Google Sheets: ${GOOGLE_SHEETS_LINK}`;

        await sendTelegramMessage(utente.telegram_chat_id, message);
        
        // Piccola pausa tra i messaggi
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Errore invio promemoria presenze a ${utente.name} ${utente.surname}:`, error);
      }
    }

  } catch (error) {
    console.error('❌ Errore generale invio promemoria presenze:', error);
  }
}

// NUOVO: REPORT SETTIMANALE TURNI VUOTI - Sabato 12:00
async function weeklyEmptyShiftsReport(timestamp) {
  try {
    if (!db) {
      const italianTime = getItalianTime();
      await sendTelegramMessage(TEST_CHAT_ID, 
        `📋 Test Report Turni Vuoti\n⏰ ${italianTime.hour}:${italianTime.minute.toString().padStart(2, '0')} (orario italiano)`);
      return;
    }

    const italianTime = getItalianTime();
    console.log(`📋 Generando report turni vuoti per la prossima settimana`);
    
    // Ottieni le date della prossima settimana
    const prossimaSettimana = getWeekDatesForOffset(1);
    
    // Ottieni tutti gli orari disponibili per la prossima settimana
    const orariResult = await db.execute({
      sql: `SELECT giorno, ora_inizio, ora_fine, note FROM fasce_orarie_prossima ORDER BY giorno, ora_inizio`,
      args: []
    });

    const orariDisponibili = orariResult.rows;
    
    if (orariDisponibili.length === 0) {
      console.log('📋 Nessun orario configurato per la prossima settimana');
      return;
    }

    // Array per raccogliere i turni vuoti
    let turniVuoti = [];
    let totaleTurniPossibili = 0;
    let totaleTurniOccupati = 0;

    // Controlla ogni giorno della prossima settimana
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dataGiorno = prossimaSettimana[dayIndex];
      const nomeGiorno = getDayName((dayIndex + 1) % 7); // Lunedì = 1, Domenica = 0
      
      // Ottieni gli orari per questo giorno della settimana
      const orariDelGiorno = orariDisponibili.filter(orario => orario.giorno === nomeGiorno);
      
      for (const orario of orariDelGiorno) {
        totaleTurniPossibili++;
        
        // Verifica se esiste già un turno per questo orario
        const turnoEsistente = await db.execute({
          sql: `SELECT COUNT(*) as count FROM turni WHERE data = ? AND turno_inizio = ? AND turno_fine = ?`,
          args: [dataGiorno, orario.ora_inizio, orario.ora_fine]
        });

        if (turnoEsistente.rows[0].count === 0) {
          // Turno vuoto trovato
          turniVuoti.push({
            data: dataGiorno,
            giorno: nomeGiorno,
            ora_inizio: orario.ora_inizio,
            ora_fine: orario.ora_fine,
            note: orario.note
          });
        } else {
          totaleTurniOccupati++;
        }
      }
    }

    // Ottieni utenti level 0 e level 1
    const adminResult = await db.execute({
      sql: `SELECT id, name, surname, telegram_chat_id, level
            FROM users 
            WHERE telegram_chat_id IS NOT NULL AND (level = 0 OR level = 1)`,
      args: []
    });

    const adminsAndModerators = adminResult.rows;

    if (adminsAndModerators.length === 0) {
      console.log('📋 Nessun admin o moderatore trovato per il report');
      return;
    }

    // Genera il messaggio del report
    let reportMessage = `📋 <b>Report Settimanale Turni Vuoti</b>

📅 Settimana: ${formatDate(prossimaSettimana[0])} - ${formatDate(prossimaSettimana[6])}
⏰ Generato: ${italianTime.hour}:${italianTime.minute.toString().padStart(2, '0')} (orario italiano)

📊 <b>Riepilogo:</b>
🔸 Turni totali disponibili: <b>${totaleTurniPossibili}</b>
✅ Turni già occupati: <b>${totaleTurniOccupati}</b>
❌ Turni vuoti: <b>${turniVuoti.length}</b>

`;

    if (turniVuoti.length === 0) {
      reportMessage += `🎉 <b>Ottimo!</b> Tutti i turni della prossima settimana sono occupati!`;
    } else {
      reportMessage += `⚠️ <b>Turni vuoti da coprire:</b>\n\n`;
      
      // Raggruppa per giorno
      const turniPerGiorno = {};
      turniVuoti.forEach(turno => {
        if (!turniPerGiorno[turno.giorno]) {
          turniPerGiorno[turno.giorno] = [];
        }
        turniPerGiorno[turno.giorno].push(turno);
      });

      // Ordina i giorni
      const giorniOrdinati = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
      
      for (const giorno of giorniOrdinati) {
        if (turniPerGiorno[giorno]) {
          reportMessage += `📅 <b>${giorno}:</b>\n`;
          
          turniPerGiorno[giorno].forEach(turno => {
            reportMessage += `   • ${turno.ora_inizio} - ${turno.ora_fine}`;
            if (turno.note) {
              reportMessage += ` (${turno.note})`;
            }
            reportMessage += `\n`;
          });
          reportMessage += `\n`;
        }
      }
    }

    // Invia il report a tutti gli admin e moderatori
    for (const user of adminsAndModerators) {
      try {
        await sendTelegramMessage(user.telegram_chat_id, reportMessage);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Errore invio report a ${user.name} ${user.surname}:`, error);
      }
    }

    console.log(`📋 Report turni vuoti inviato a ${adminsAndModerators.length} utenti (admin/moderatori)`);

  } catch (error) {
    console.error('❌ Errore nel report turni vuoti:', error);
    
    // Invia notifica di errore
    await sendTelegramMessage(TEST_CHAT_ID, 
      `❌ Errore nel report turni vuoti: ${error.message}`);
  }
}

// FUNZIONE CAMBIO SETTIMANA CORRETTA - Domenica 23:59 (orario italiano)
async function sundayEndTask(timestamp) {
  const italianTime = getItalianTime();
  console.log(`📊 Task fine domenica (23:59 orario italiano) - Cambio settimana con gestione 4 settimane di orari`);
  
  try {
    if (!db) {
      await sendTelegramMessage(TEST_CHAT_ID, '⚠️ Database non disponibile per cambio settimana');
      return;
    }

    // STEP 1: Calcola le date delle 4 settimane da gestire
    const settimanaCorrente = getWeekDatesForOffset(0);    // Settimana che sta finendo
    const settimana1 = getWeekDatesForOffset(1);           // Diventa la nuova "corrente" 
    const settimana2 = getWeekDatesForOffset(2);           // Diventa la nuova "prossima"
    const settimana3 = getWeekDatesForOffset(3);           // Diventa la nuova "plus2"
    const settimana4 = getWeekDatesForOffset(4);           // Diventa la nuova "plus3"

    console.log(`🗓️ Cambio settimana - eliminando: ${settimanaCorrente[0]} - ${settimanaCorrente[6]}`);
    console.log(`🗓️ Settimane future: ${settimana1[0]} → ${settimana2[0]} → ${settimana3[0]} → ${settimana4[0]}`);

    // STEP 2: Cancella turni della settimana che sta finendo
    const deleteTurniResult = await db.execute({
      sql: `DELETE FROM turni WHERE data >= ? AND data <= ?`,
      args: [settimanaCorrente[0], settimanaCorrente[6]]
    });

    console.log(`🗑️ Eliminati ${deleteTurniResult.rowsAffected} turni della settimana terminata`);

    // STEP 3: ROTAZIONE ORARI CORRETTA - Salva TUTTI i dati prima di iniziare le cancellazioni
    console.log(`🔄 Inizio rotazione orari...`);
    
    // 3.1 SALVA tutti gli orari esistenti PRIMA di fare qualsiasi cancellazione
    const orariCorrente = await db.execute({
      sql: `SELECT giorno, ora_inizio, ora_fine, note FROM fasce_orarie ORDER BY giorno, ora_inizio`,
      args: []
    });
    console.log(`📋 Orari settimana corrente salvati: ${orariCorrente.rows.length}`);

    const orariProssima = await db.execute({
      sql: `SELECT giorno, ora_inizio, ora_fine, note FROM fasce_orarie_prossima ORDER BY giorno, ora_inizio`,
      args: []
    });
    console.log(`📋 Orari settimana prossima salvati: ${orariProssima.rows.length}`);
    
    const orariPlus2 = await db.execute({
      sql: `SELECT giorno, ora_inizio, ora_fine, note FROM fasce_orarie_plus2 ORDER BY giorno, ora_inizio`,
      args: []
    });
    console.log(`📋 Orari settimana plus2 salvati: ${orariPlus2.rows.length}`);
    
    const orariPlus3 = await db.execute({
      sql: `SELECT giorno, ora_inizio, ora_fine, note FROM fasce_orarie_plus3 ORDER BY giorno, ora_inizio`,
      args: []
    });
    console.log(`📋 Orari settimana plus3 salvati: ${orariPlus3.rows.length}`);

    // 3.2 CANCELLA tutte le tabelle orari
    console.log(`🗑️ Cancellazione tabelle orari...`);
    
    await db.execute({ sql: `DELETE FROM fasce_orarie`, args: [] });
    console.log(`✅ Tabella fasce_orarie cancellata`);
    
    await db.execute({ sql: `DELETE FROM fasce_orarie_prossima`, args: [] });
    console.log(`✅ Tabella fasce_orarie_prossima cancellata`);
    
    await db.execute({ sql: `DELETE FROM fasce_orarie_plus2`, args: [] });
    console.log(`✅ Tabella fasce_orarie_plus2 cancellata`);
    
    await db.execute({ sql: `DELETE FROM fasce_orarie_plus3`, args: [] });
    console.log(`✅ Tabella fasce_orarie_plus3 cancellata`);

    // 3.3 RICOSTRUISCI la rotazione degli orari
    console.log(`🔄 Ricostruzione rotazione orari...`);
    
    // PROSSIMA → CORRENTE (orariProssima va in fasce_orarie)
    let orariSpostatiProssimaCorrente = 0;
    for (const orario of orariProssima.rows) {
      try {
        await db.execute({
          sql: `INSERT INTO fasce_orarie (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?)`,
          args: [orario.giorno, orario.ora_inizio, orario.ora_fine, orario.note || null]
        });
        orariSpostatiProssimaCorrente++;
        console.log(`  ✅ Spostato orario: ${orario.giorno} ${orario.ora_inizio}-${orario.ora_fine} → corrente`);
      } catch (error) {
        console.error(`❌ Errore spostamento prossima→corrente:`, error);
        throw new Error(`Errore rotazione prossima→corrente: ${error.message}`);
      }
    }
    console.log(`📊 Orari spostati prossima→corrente: ${orariSpostatiProssimaCorrente}`);

    // PLUS2 → PROSSIMA (orariPlus2 va in fasce_orarie_prossima)
    let orariSpostatiPlus2Prossima = 0;
    for (const orario of orariPlus2.rows) {
      try {
        await db.execute({
          sql: `INSERT INTO fasce_orarie_prossima (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?)`,
          args: [orario.giorno, orario.ora_inizio, orario.ora_fine, orario.note || null]
        });
        orariSpostatiPlus2Prossima++;
        console.log(`  ✅ Spostato orario: ${orario.giorno} ${orario.ora_inizio}-${orario.ora_fine} → prossima`);
      } catch (error) {
        console.error(`❌ Errore spostamento plus2→prossima:`, error);
        throw new Error(`Errore rotazione plus2→prossima: ${error.message}`);
      }
    }
    console.log(`📊 Orari spostati plus2→prossima: ${orariSpostatiPlus2Prossima}`);

    // PLUS3 → PLUS2 (orariPlus3 va in fasce_orarie_plus2)
    let orariSpostatiPlus3Plus2 = 0;
    for (const orario of orariPlus3.rows) {
      try {
        await db.execute({
          sql: `INSERT INTO fasce_orarie_plus2 (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?)`,
          args: [orario.giorno, orario.ora_inizio, orario.ora_fine, orario.note || null]
        });
        orariSpostatiPlus3Plus2++;
        console.log(`  ✅ Spostato orario: ${orario.giorno} ${orario.ora_inizio}-${orario.ora_fine} → plus2`);
      } catch (error) {
        console.error(`❌ Errore spostamento plus3→plus2:`, error);
        throw new Error(`Errore rotazione plus3→plus2: ${error.message}`);
      }
    }
    console.log(`📊 Orari spostati plus3→plus2: ${orariSpostatiPlus3Plus2}`);

    // PLUS3 rimane vuoto per la nuova settimana 4
    console.log(`📋 Tabella fasce_orarie_plus3 lasciata vuota per la nuova settimana 4`);

    // 3.4 VERIFICA la rotazione
    console.log(`🔍 Verifica rotazione completata...`);
    
    const verificaCorrente = await db.execute({ sql: `SELECT COUNT(*) as count FROM fasce_orarie`, args: [] });
    const verificaProssima = await db.execute({ sql: `SELECT COUNT(*) as count FROM fasce_orarie_prossima`, args: [] });
    const verificaPlus2 = await db.execute({ sql: `SELECT COUNT(*) as count FROM fasce_orarie_plus2`, args: [] });
    const verificaPlus3 = await db.execute({ sql: `SELECT COUNT(*) as count FROM fasce_orarie_plus3`, args: [] });

    console.log(`📊 Verifica post-rotazione:`);
    console.log(`  - fasce_orarie: ${verificaCorrente.rows[0].count} orari`);
    console.log(`  - fasce_orarie_prossima: ${verificaProssima.rows[0].count} orari`);
    console.log(`  - fasce_orarie_plus2: ${verificaPlus2.rows[0].count} orari`);
    console.log(`  - fasce_orarie_plus3: ${verificaPlus3.rows[0].count} orari`);

    // STEP 4: Conta i turni esistenti per le settimane future per il report
    const turniSettimana1 = await db.execute({
      sql: `SELECT COUNT(*) as count FROM turni WHERE data >= ? AND data <= ?`,
      args: [settimana1[0], settimana1[6]]
    });

    const turniSettimana2 = await db.execute({
      sql: `SELECT COUNT(*) as count FROM turni WHERE data >= ? AND data <= ?`,
      args: [settimana2[0], settimana2[6]]
    });

    const turniSettimana3 = await db.execute({
      sql: `SELECT COUNT(*) as count FROM turni WHERE data >= ? AND data <= ?`,
      args: [settimana3[0], settimana3[6]]
    });

    const turniSettimana4 = await db.execute({
      sql: `SELECT COUNT(*) as count FROM turni WHERE data >= ? AND data <= ?`,
      args: [settimana4[0], settimana4[6]]
    });

    // STEP 5: Ottieni solo gli admin (level = 0) per notificarli del cambio settimana
    const adminResult = await db.execute({
      sql: `SELECT id, name, surname, telegram_chat_id, level
            FROM users 
            WHERE telegram_chat_id IS NOT NULL AND level = 0`,
      args: []
    });

    const admins = adminResult.rows;

    // STEP 6: Genera report del cambio settimana
    const summary = `🔄 <b>Cambio Settimana Completato</b>

📅 Settimana terminata: ${formatDate(settimanaCorrente[0])} - ${formatDate(settimanaCorrente[6])}
⏰ Eseguito alle: ${italianTime.hour}:${italianTime.minute.toString().padStart(2, '0')} (orario italiano)

📊 <b>Operazioni eseguite:</b>
🗑️ Turni eliminati: <b>${deleteTurniResult.rowsAffected}</b>

🔄 <b>Rotazione orari completata:</b>
📋 Prossima → Corrente: <b>${orariSpostatiProssimaCorrente}</b> orari
📋 Plus2 → Prossima: <b>${orariSpostatiPlus2Prossima}</b> orari  
📋 Plus3 → Plus2: <b>${orariSpostatiPlus3Plus2}</b> orari
🆕 Plus3: <b>vuoto</b> (pronto per nuovi orari)

🔍 <b>Verifica tabelle orari:</b>
• Corrente: <b>${verificaCorrente.rows[0].count}</b> orari
• Prossima: <b>${verificaProssima.rows[0].count}</b> orari
• Plus2: <b>${verificaPlus2.rows[0].count}</b> orari
• Plus3: <b>${verificaPlus3.rows[0].count}</b> orari

📅 <b>Turni esistenti nelle settimane future:</b>
• Settimana 1 (${formatDate(settimana1[0])} - ${formatDate(settimana1[6])}): <b>${turniSettimana1.rows[0].count}</b> turni
• Settimana 2 (${formatDate(settimana2[0])} - ${formatDate(settimana2[6])}): <b>${turniSettimana2.rows[0].count}</b> turni  
• Settimana 3 (${formatDate(settimana3[0])} - ${formatDate(settimana3[6])}): <b>${turniSettimana3.rows[0].count}</b> turni
• Settimana 4 (${formatDate(settimana4[0])} - ${formatDate(settimana4[6])}): <b>${turniSettimana4.rows[0].count}</b> turni

✅ Sistema pronto per la nuova settimana!
🎯 Rotazione completa delle 4 settimane di orari completata con successo`;

    // Invia notifica a tutti gli admin (level = 0)
    let notificheInviate = 0;
    for (const admin of admins) {
      try {
        await sendTelegramMessage(admin.telegram_chat_id, summary);
        notificheInviate++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Errore invio notifica cambio settimana a ${admin.name} ${admin.surname}:`, error);
      }
    }

    console.log(`📨 Notifiche cambio settimana inviate a ${notificheInviate} admin (level=0)`);

    // Log anche nel database se possibile
    await db.execute({
      sql: `INSERT INTO cron_logs (task_type, executed_at, status, error_message) VALUES (?, ?, ?, ?)`,
      args: ['week_change', timestamp.toISOString(), 'success', 
        `Turni eliminati: ${deleteTurniResult.rowsAffected}, Rotazione orari: ${orariSpostatiProssimaCorrente}+${orariSpostatiPlus2Prossima}+${orariSpostatiPlus3Plus2}, Notifiche admin: ${notificheInviate}`]
    }).catch(error => {
      console.error('Errore nel log cambio settimana:', error);
    });

  } catch (error) {
    console.error('❌ Errore nel cambio settimana:', error);
    
    // Invia notifica di errore a tutti gli admin (level = 0)
    const errorMessage = `❌ <b>Errore Cambio Settimana</b>
      
⏰ Domenica 23:59 (orario italiano)
🚨 Errore: ${error.message}

⚠️ Il cambio settimana potrebbe non essere stato completato correttamente!
🔧 Verificare manualmente il sistema turni e orari.

📋 <b>Possibili problemi:</b>
• Rotazione orari non completata
• Tabelle orari in stato inconsistente
• Verificare manualmente le tabelle fasce_orarie*`;

    // Ottieni admin per notifica errore
    if (db) {
      try {
        const adminResult = await db.execute({
          sql: `SELECT telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL AND level = 0`,
          args: []
        });

        for (const admin of adminResult.rows) {
          try {
            await sendTelegramMessage(admin.telegram_chat_id, errorMessage);
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            console.error('Errore invio notifica errore:', err);
          }
        }
      } catch (dbError) {
        console.error('Errore accesso DB per notifica errore:', dbError);
      }
    }

    // Invia sempre al chat di test
    await sendTelegramMessage(TEST_CHAT_ID, errorMessage);
    
    throw error;
  }
}

// Task generale per test e chiamate non programmate
async function generalTask(timestamp) {
  const italianTime = getItalianTime();
  console.log('🔧 Task generale eseguito');
  
  const message = `🔧 Task Generale Eseguito
⏰ Orario: ${italianTime.hour}:${italianTime.minute.toString().padStart(2, '0')} (🇮🇹 ITALIA)
📅 Data: ${italianTime.date.toLocaleDateString('it-IT')}
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
        args: [taskType, timestamp.toISOString(), status, errorMessage]
      });
    }
    console.log(`📝 Log esecuzione salvato: ${taskType} - ${status}`);
  } catch (error) {
    console.error('❌ Errore salvataggio log:', error);
  }
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getDayName(dayIndex) {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return days[dayIndex];
}