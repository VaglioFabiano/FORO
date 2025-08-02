// api/cron.js
import { Client } from '@libsql/client';
import { Resend } from 'resend';

// Inizializza i client (usa le variabili d'ambiente di Vercel)
const db = new Client({
  url: process.env.LIBSQL_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Configurazione Telegram
const TELEGRAM_BOT_TOKEN = '7608037480:AAGkJbIf02G98dTEnREBhfjI2yna5-Y1pzc';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TEST_CHAT_ID = '1129901266'; // Chat ID per i test

export default async function handler(req, res) {
  // Verifica metodo HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verifica autorizzazione (opzionale ma consigliato per sicurezza)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay(); // 0 = Domenica, 1 = Lunedì, etc.
  
  console.log(`🕐 Cron job eseguito alle ${currentHour}:${currentMinute.toString().padStart(2, '0')} del ${getDayName(currentDay)}`);

  try {
    let taskExecuted = false;
    let taskType = '';

    // Controlla quale task eseguire in base all'orario
    if (currentHour === 8 && currentMinute === 0) {
      taskType = 'morning_task';
      taskExecuted = true;
    } 
    else if (currentHour === 12 && currentMinute === 20) {
      taskType = 'telegram_test_1'; // TEST: 12:20
      taskExecuted = true;
    }
    else if (currentHour === 12 && currentMinute === 30) {
      taskType = 'telegram_test_2'; // TEST: 12:30
      taskExecuted = true;
    }
    else if (currentHour === 12 && currentMinute === 31) {
      taskType = 'telegram_test_3'; // TEST: 12:31
      taskExecuted = true;
    }
    else if (currentHour === 15 && currentMinute === 0) {
      taskType = 'afternoon_task';
      taskExecuted = true;
    }
    else if (currentHour === 15 && currentMinute === 30) {
      taskType = 'late_afternoon_task';
      taskExecuted = true;
    }
    else if (currentHour === 19 && currentMinute === 0) {
      taskType = 'evening_task';
      taskExecuted = true;
    }
    else if (currentHour === 20 && currentMinute === 30) {
      taskType = 'night_task';
      taskExecuted = true;
    }
    else if (currentHour === 23 && currentMinute === 30) {
      taskType = 'late_night_task';
      taskExecuted = true;
    }
    else if (currentHour === 23 && currentMinute === 59 && currentDay === 0) {
      taskType = 'sunday_end_task';
      taskExecuted = true;
    }

    if (taskExecuted) {
      await handleTask(taskType, now);
      
      // Log dell'esecuzione nel database (opzionale)
      await logExecution(taskType, now, 'success');
    }

    return res.status(200).json({ 
      message: taskExecuted ? 'Cron job completato con successo' : 'Nessun task da eseguire per questo orario',
      taskType: taskType || 'none',
      timestamp: now.toISOString(),
      executed: taskExecuted
    });

  } catch (error) {
    console.error('❌ Errore nel cron job:', error);
    
    // Log dell'errore nel database (opzionale)
    if (taskType) {
      await logExecution(taskType, now, 'error', error.message);
    }
    
    return res.status(500).json({ 
      error: 'Errore interno del server',
      timestamp: now.toISOString(),
      details: error.message
    });
  }
}

// Funzione principale per gestire i diversi task
async function handleTask(taskType, timestamp) {
  console.log(`🚀 Eseguendo task: ${taskType} alle ${timestamp.toISOString()}`);
  
  switch (taskType) {
    case 'morning_task':
      await morningTask();
      break;
      
    case 'telegram_test_1':
      await telegramTest1(timestamp);
      break;
      
    case 'telegram_test_2':
      await telegramTest2(timestamp);
      break;
      
    case 'telegram_test_3':
      await telegramTest3(timestamp);
      break;
      
    case 'afternoon_task':
      await afternoonTask();
      break;
      
    case 'late_afternoon_task':
      await lateAfternoonTask();
      break;
      
    case 'evening_task':
      await eveningTask();
      break;
      
    case 'night_task':
      await nightTask();
      break;
      
    case 'late_night_task':
      await lateNightTask();
      break;
      
    case 'sunday_end_task':
      await sundayEndTask();
      break;
      
    default:
      console.log('⚠️ Task non riconosciuto:', taskType);
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

// Task di test Telegram
async function telegramTest1(timestamp) {
  console.log('📱 Test Telegram 1 (12:20)');
  
  const message = `🕰️ Test Cron Job #1
⏰ Orario: 12:20
📅 Data: ${timestamp.toLocaleDateString('it-IT')}
🔄 Il sistema cron sta funzionando correttamente!

Questo è il primo test alle 12:20.`;

  await sendTelegramMessage(TEST_CHAT_ID, message);
}

async function telegramTest2(timestamp) {
  console.log('📱 Test Telegram 2 (12:30)');
  
  const message = `🕰️ Test Cron Job #2
⏰ Orario: 12:30
📅 Data: ${timestamp.toLocaleDateString('it-IT')}
🍽️ Ora di pranzo! 

Questo è il secondo test alle 12:30.`;

  await sendTelegramMessage(TEST_CHAT_ID, message);
}

async function telegramTest3(timestamp) {
  console.log('📱 Test Telegram 3 (12:31)');
  
  const message = `🕰️ Test Cron Job #3
⏰ Orario: 12:31
📅 Data: ${timestamp.toLocaleDateString('it-IT')}
✅ Test completato con successo!

Questo è il terzo e ultimo test alle 12:31.
Il sistema cron è configurato correttamente! 🎉`;

  await sendTelegramMessage(TEST_CHAT_ID, message);
}

// Task specifici originali
async function morningTask() {
  console.log('☀️ Task mattutino (8:00) - Inizio giornata');
  
  // Invia anche un messaggio Telegram per il task mattutino
  await sendTelegramMessage(TEST_CHAT_ID, '☀️ Buongiorno! Il task mattutino è stato eseguito alle 8:00.');
  
  // Esempio: invia email di riepilogo giornaliero
  await sendEmail({
    subject: 'Buongiorno! Riepilogo della giornata',
    content: 'La giornata è iniziata. Controlla gli aggiornamenti.',
  });
  
  // Esempio: aggiorna statistiche nel database
  await updateDailyStats();
}

async function afternoonTask() {
  console.log('🌅 Task pomeridiano (15:00)');
  
  await sendTelegramMessage(TEST_CHAT_ID, '🌅 Task pomeridiano eseguito alle 15:00.');
  await processMidDayData();
}

async function lateAfternoonTask() {
  console.log('🌆 Task tardo pomeriggio (15:30)');
  
  await sendTelegramMessage(TEST_CHAT_ID, '🌆 Task del tardo pomeriggio eseguito alle 15:30.');
  await prepareEndOfDayReport();
}

async function eveningTask() {
  console.log('🌃 Task serale (19:00)');
  
  await sendTelegramMessage(TEST_CHAT_ID, '🌃 Task serale eseguito alle 19:00.');
  await backupDailyData();
}

async function nightTask() {
  console.log('🌙 Task notturno (20:30)');
  
  await sendTelegramMessage(TEST_CHAT_ID, '🌙 Task notturno eseguito alle 20:30.');
  await cleanupAndOptimize();
}

async function lateNightTask() {
  console.log('🌌 Task tarda notte (23:30)');
  
  await sendTelegramMessage(TEST_CHAT_ID, '🌌 Task di tarda notte eseguito alle 23:30.');
  await prepareForNextDay();
}

async function sundayEndTask() {
  console.log('📊 Task fine domenica (23:59)');
  
  await generateWeeklyReport();
  
  await sendTelegramMessage(TEST_CHAT_ID, '📊 Report settimanale generato! Fine settimana alle 23:59 di domenica.');
  
  await sendEmail({
    subject: 'Report Settimanale',
    content: 'Ecco il riepilogo della settimana appena conclusa.',
  });
}

// Funzioni di supporto
async function sendEmail({ subject, content, to = process.env.DEFAULT_EMAIL }) {
  if (!process.env.RESEND_API_KEY || !to) {
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

async function updateDailyStats() {
  try {
    // Esempio di query al database
    if (db) {
      await db.execute({
        sql: `INSERT INTO daily_stats (date, task_type, executed_at) VALUES (?, ?, ?)`,
        args: [new Date().toISOString().split('T')[0], 'morning_task', new Date().toISOString()]
      });
    }
    console.log('📊 Statistiche giornaliere aggiornate');
  } catch (error) {
    console.error('❌ Errore aggiornamento statistiche:', error);
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

// Implementa queste funzioni in base alle tue esigenze specifiche
async function processMidDayData() {
  console.log('📊 Elaborazione dati di metà giornata...');
  // La tua logica qui
}

async function prepareEndOfDayReport() {
  console.log('📋 Preparazione report fine giornata...');
  // La tua logica qui
}

async function backupDailyData() {
  console.log('💾 Backup dati giornalieri...');
  // La tua logica qui
}

async function cleanupAndOptimize() {
  console.log('🧹 Pulizia e ottimizzazione...');
  // La tua logica qui
}

async function prepareForNextDay() {
  console.log('🗓️ Preparazione per domani...');
  // La tua logica qui
}

async function generateWeeklyReport() {
  console.log('📈 Generazione report settimanale...');
  // La tua logica qui
}

// Utility function
function getDayName(dayIndex) {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return days[dayIndex];
}