// api/cron.js
import { createClient } from '@libsql/client/web';
import { Resend } from 'resend';

// Inizializza i client (usa le variabili d'ambiente di Vercel)
const config = {
  url: process.env.LIBSQL_URL?.trim(),
  authToken: process.env.LIBSQL_AUTH_TOKEN?.trim()
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

export default async function handler(req, res) {
  // Accetta sia GET che POST per test
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay(); // 0 = Domenica, 1 = Lunedì, etc.
  
  console.log(`🕐 Cron job eseguito alle ${currentHour}:${currentMinute.toString().padStart(2, '0')} del ${getDayName(currentDay)}`);

  try {
    // Determina il task in base all'orario attuale
    const taskType = determineTaskType(currentHour, currentMinute, currentDay);
    
    if (taskType) {
      await handleTask(taskType, now);
      await logExecution(taskType, now, 'success');
      
      return res.status(200).json({ 
        message: 'Cron job completato con successo',
        taskType: taskType,
        timestamp: now.toISOString(),
        executed: true
      });
    } else {
      // Esegui comunque un task di default per i test
      await handleTask('general_task', now);
      
      return res.status(200).json({ 
        message: 'Task generale eseguito',
        taskType: 'general_task',
        timestamp: now.toISOString(),
        executed: true
      });
    }

  } catch (error) {
    console.error('❌ Errore nel cron job:', error);
    
    await logExecution('error_task', now, 'error', error.message).catch(() => {});
    
    return res.status(500).json({ 
      error: 'Errore interno del server',
      timestamp: now.toISOString(),
      details: error.message
    });
  }
}

// Funzione per determinare il tipo di task in base all'orario
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
  
  // Task domenica sera
  if (hour === 23 && minute === 59 && day === 0) {
    return 'sunday_end_task';
  }
  
  return null;
}

// Funzione principale per gestire i diversi task
async function handleTask(taskType, timestamp) {
  console.log(`🚀 Eseguendo task: ${taskType} alle ${timestamp.toISOString()}`);
  
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
    
    console.log('✅ Messaggio Telegram inviato con successo:', message);
    return data.result;
  } catch (error) {
    console.error('❌ Errore invio messaggio Telegram:', error);
    throw error;
  }
}

// Funzione per ottenere il chat_id di un utente
async function getUserTelegramChatId(userId) {
  try {
    if (!db) return null;
    
    const result = await db.execute({
      sql: `SELECT telegram_chat_id FROM users WHERE id = ? AND telegram_chat_id IS NOT NULL`,
      args: [userId]
    });
    
    return result.rows.length > 0 ? result.rows[0].telegram_chat_id : null;
  } catch (error) {
    console.error('Errore nel recupero chat_id:', error);
    return null;
  }
}

// FUNZIONE PRINCIPALE: Invia promemoria turni
async function sendTurnoReminders(turnoInizio, turnoFine, timestamp) {
  try {
    if (!db) {
      console.log('⚠️ Database non disponibile, invio messaggio di test');
      await sendTelegramMessage(TEST_CHAT_ID, 
        `🔔 Test Promemoria Turni ${turnoInizio}-${turnoFine}\n⏰ ${timestamp.toLocaleTimeString('it-IT')}`);
      return;
    }

    // Ottieni la data di oggi
    const today = timestamp.toISOString().split('T')[0];
    
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
    let messagessent = 0;
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
        messagesent++;
        
        // Piccola pausa tra i messaggi
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Errore invio promemoria a ${turno.name} ${turno.surname}:`, error);
        messagesFailed++;
      }
    }

    // Invia riepilogo al chat di test
    const summary = `📊 <b>Riepilogo Promemoria ${turnoInizio}-${turnoFine}</b>

✅ Messaggi inviati: ${messagesent}
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

// Task generale per test e chiamate non programmate
async function generalTask(timestamp) {
  console.log('🔧 Task generale eseguito');
  
  const message = `🔧 Task Generale Eseguito
⏰ Orario: ${timestamp.getHours()}:${timestamp.getMinutes().toString().padStart(2, '0')}
📅 Data: ${timestamp.toLocaleDateString('it-IT')}
🚀 Il sistema funziona!

Chiamata ricevuta correttamente.`;

  await sendTelegramMessage(TEST_CHAT_ID, message);
}

// FUNZIONE PER PROMEMORIA PRESENZE
async function sendPresenzeReminder(fasciaOraria, timestamp) {
  try {
    if (!db) {
      console.log('⚠️ Database non disponibile, invio messaggio di test');
      await sendTelegramMessage(TEST_CHAT_ID, 
        `📊 Test Promemoria Presenze ${fasciaOraria}\n⏰ ${timestamp.toLocaleTimeString('it-IT')}`);
      return;
    }

    // Ottieni la data di oggi
    const today = timestamp.toISOString().split('T')[0];
    
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
        `📊 Nessun utente con permessi trovato per promemoria presenze ${fasciaOraria}`);
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
⏰ Invio alle: ${timestamp.toLocaleTimeString('it-IT')}`;

    await sendTelegramMessage(TEST_CHAT_ID, summary);

  } catch (error) {
    console.error('❌ Errore generale invio promemoria presenze:', error);
    
    // Invia notifica di errore
    await sendTelegramMessage(TEST_CHAT_ID, 
      `❌ Errore nel sistema promemoria presenze ${fasciaOraria}: ${error.message}`);
  }
}

async function sundayEndTask(timestamp) {
  console.log('📊 Task fine domenica (23:59)');
  await sendTelegramMessage(TEST_CHAT_ID, '📊 Report settimanale - Domenica 23:59.');
}

// Funzioni di supporto
async function sendEmail({ subject, content, to = process.env.DEFAULT_EMAIL }) {
  if (!resend || !to) {
    console.log('📧 Email non inviata: configurazione mancante');
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject: subject,
      text: content,
    });

    if (error) {
      console.error('❌ Errore invio email:', error);
    } else {
      console.log('✅ Email inviata con successo:', data.id);
    }
  } catch (error) {
    console.error('❌ Errore invio email:', error);
  }
}

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