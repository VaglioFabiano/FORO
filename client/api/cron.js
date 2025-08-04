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

// Funzione per determinare il tipo di task in base all'orario ITALIANO
function determineTaskType(hour, minute, day) {
  // PROMEMORIA TURNI
  if (hour === 8 && minute === 0) {
    return 'reminder_morning'; // Promemoria turni 9:00-13:00
  }
  
  if (hour === 12 && minute === 0) {
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
      await sendPresenzeReminder('9-13', timestamp);
      break;
      
    case 'reminder_presenze_13_16':
      await sendPresenzeReminder('13-16', timestamp);
      break;
      
    case 'reminder_presenze_16_19':
      await sendPresenzeReminder('16-19', timestamp);
      break;
      
    case 'reminder_presenze_21_24':
      await sendPresenzeReminder('21-24', timestamp);
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

// Funzione per ottenere i giorni della settimana corrente (usando orario italiano)
function getCurrentWeekDates() {
  const italianTime = getItalianTime();
  const now = italianTime.date;
  const currentDay = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date.toISOString().split('T')[0]);
  }
  return weekDates;
}

// Funzione per ottenere i giorni della prossima settimana (usando orario italiano)
function getNextWeekDates() {
  const italianTime = getItalianTime();
  const now = italianTime.date;
  const currentDay = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + 7);
  
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
      // Nessun turno trovato per questa fascia
      await sendTelegramMessage(TEST_CHAT_ID, 
        `📋 Nessun turno programmato oggi ${today} dalle ${turnoInizio} alle ${turnoFine}`);
      return;
    }

    // Invia promemoria a ogni persona in turno
    let messagesSent = 0;
    let messagesFailed = 0;

    for (const turno of turni) {
      try {
        const message = `🔔 <b>Promemoria Turno</b>

Ciao <b>${turno.name} ${turno.surname}</b>, ti ricordo il tuo turno di oggi orario <b>${turno.turno_inizio}-${turno.turno_fine}</b> in aula studio foro.

📅 Data: ${formatDate(turno.data)}
⏰ Orario: ${turno.turno_inizio} - ${turno.turno_fine}
${turno.note ? `📝 Note: ${turno.note}` : ''}

Buon lavoro! 💪`;

        await sendTelegramMessage(turno.telegram_chat_id, message);
        messagesSent++;
        
        // Piccola pausa tra i messaggi
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Errore invio promemoria a ${turno.name} ${turno.surname}:`, error);
        messagesFailed++;
      }
    }

    // Invia riepilogo al chat di test
    const summary = `📊 <b>Riepilogo Promemoria ${turnoInizio}-${turnoFine}</b>

✅ Messaggi inviati: ${messagesSent}
❌ Messaggi falliti: ${messagesFailed}
📋 Totale turni: ${turni.length}

Data: ${formatDate(today)}`;

    await sendTelegramMessage(TEST_CHAT_ID, summary);

  } catch (error) {
    console.error('❌ Errore generale invio promemoria:', error);
    
    // Invia notifica di errore
    await sendTelegramMessage(TEST_CHAT_ID, 
      `❌ Errore nel sistema promemoria turni ${turnoInizio}-${turnoFine}: ${error.message}`);
  }
}

// FUNZIONE PER PROMEMORIA PRESENZE
async function sendPresenzeReminder(fasciaOraria, timestamp) {
  try {
    if (!db) {
      const italianTime = getItalianTime();
      console.log('⚠️ Database non disponibile, invio messaggio di test');
      await sendTelegramMessage(TEST_CHAT_ID, 
        `📊 Test Promemoria Presenze ${fasciaOraria}\n⏰ ${italianTime.hour}:${italianTime.minute.toString().padStart(2, '0')} (orario italiano)`);
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

    // Ottieni tutti gli utenti con chat_id Telegram (qualsiasi livello)
    const usersResult = await db.execute({
      sql: `SELECT id, name, surname, telegram_chat_id, level
            FROM users 
            WHERE telegram_chat_id IS NOT NULL`,
      args: []
    });

    const users = usersResult.rows;
    console.log(`👥 Trovati ${users.length} utenti da notificare`);

    if (users.length === 0) {
      await sendTelegramMessage(TEST_CHAT_ID, 
        `📊 Nessun utente trovato per promemoria presenze ${fasciaOraria}`);
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

    // Invia notifica a ogni utente autorizzato
    let messagesSent = 0;
    let messagesFailed = 0;

    for (const user of users) {
      try {
        const message = `${messageIcon} <b>Promemoria Presenze</b>

Ciao <b>${user.name} ${user.surname}</b>,

📊 Fascia oraria: <b>${fasciaOraria}</b>
📅 Data: <b>${formatDate(today)}</b>
${messageType}

${isAlreadyFilled ? 
  '✅ Le presenze sono già state registrate per questa fascia.' : 
  '⚠️ Ricordati di inserire le presenze per questa fascia oraria nel sistema.'
}

🔗 Accedi al sistema per gestire le presenze.`;

        await sendTelegramMessage(user.telegram_chat_id, message);
        messagesSent++;
        
        // Piccola pausa tra i messaggi
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Errore invio promemoria presenze a ${user.name} ${user.surname}:`, error);
        messagesFailed++;
      }
    }

    // Invia riepilogo al chat di test
    const summary = `📊 <b>Riepilogo Promemoria Presenze ${fasciaOraria}</b>

${messageIcon} Stato: ${messageType}
✅ Messaggi inviati: ${messagesSent}
❌ Messaggi falliti: ${messagesFailed}
👥 Utenti notificati: ${users.length}

📅 Data: ${formatDate(today)}
⏰ Invio alle: ${italianTime.hour}:${italianTime.minute.toString().padStart(2, '0')} (orario italiano)`;

    await sendTelegramMessage(TEST_CHAT_ID, summary);

  } catch (error) {
    console.error('❌ Errore generale invio promemoria presenze:', error);
    
    // Invia notifica di errore
    await sendTelegramMessage(TEST_CHAT_ID, 
      `❌ Errore nel sistema promemoria presenze ${fasciaOraria}: ${error.message}`);
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

// FUNZIONE CAMBIO SETTIMANA - Domenica 23:59 (orario italiano)
async function sundayEndTask(timestamp) {
  const italianTime = getItalianTime();
  console.log(`📊 Task fine domenica (23:59 orario italiano) - Cambio settimana con 4 settimane di turni`);
  
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

    // STEP 3: Gestione orari (solo 2 settimane: corrente e prossima)
    // Cancella orari della settimana corrente
    const deleteFasceResult = await db.execute({
      sql: `DELETE FROM fasce_orarie`,
      args: []
    });

    console.log(`🗑️ Eliminati ${deleteFasceResult.rowsAffected} orari settimana corrente`);

    // Sposta orari dalla "prossima settimana" alla "settimana corrente"
    const prossimiOrari = await db.execute({
      sql: `SELECT giorno, ora_inizio, ora_fine, note FROM fasce_orarie_prossima`,
      args: []
    });

    let orariSpostati = 0;
    for (const orario of prossimiOrari.rows) {
      try {
        await db.execute({
          sql: `INSERT INTO fasce_orarie (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?)`,
          args: [orario.giorno, orario.ora_inizio, orario.ora_fine, orario.note]
        });
        orariSpostati++;
      } catch (error) {
        console.error(`Errore nello spostamento orario:`, error);
      }
    }

    console.log(`📋 Spostati ${orariSpostati} orari da prossima a corrente`);

    // Cancella orari "prossima settimana" (ora diventati correnti)
    const deleteProssimaResult = await db.execute({
      sql: `DELETE FROM fasce_orarie_prossima`,
      args: []
    });

    console.log(`🗑️ Eliminati ${deleteProssimaResult.rowsAffected} orari prossima settimana`);

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
🗑️ Orari correnti eliminati: <b>${deleteFasceResult.rowsAffected}</b>
📋 Orari spostati: <b>${orariSpostati}</b>
🗑️ Orari prossimi eliminati: <b>${deleteProssimaResult.rowsAffected}</b>

📅 <b>Turni esistenti nelle settimane future:</b>
• Settimana 1 (${formatDate(settimana1[0])} - ${formatDate(settimana1[6])}): <b>${turniSettimana1.rows[0].count}</b> turni
• Settimana 2 (${formatDate(settimana2[0])} - ${formatDate(settimana2[6])}): <b>${turniSettimana2.rows[0].count}</b> turni  
• Settimana 3 (${formatDate(settimana3[0])} - ${formatDate(settimana3[6])}): <b>${turniSettimana3.rows[0].count}</b> turni
• Settimana 4 (${formatDate(settimana4[0])} - ${formatDate(settimana4[6])}): <b>${turniSettimana4.rows[0].count}</b> turni

✅ Sistema pronto per la nuova settimana!
🎯 Tutte le 4 settimane di turni mantenute`;

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

    // Invia anche al chat di test per debug
    await sendTelegramMessage(TEST_CHAT_ID, summary + `\n\n📨 Notifiche inviate a ${notificheInviate} admin (level=0)`);

    // Log anche nel database se possibile
    await db.execute({
      sql: `INSERT INTO cron_logs (task_type, executed_at, status, error_message) VALUES (?, ?, ?, ?)`,
      args: ['week_change', timestamp.toISOString(), 'success', 
        `Turni eliminati: ${deleteTurniResult.rowsAffected}, Orari spostati: ${orariSpostati}, Notifiche admin: ${notificheInviate}`]
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
🔧 Verificare manualmente il sistema turni.`;

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