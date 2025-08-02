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
// Funzione per determinare il tipo di task in base all'orario
function determineTaskType(hour, minute, day) {
  // TEST IMMEDIATI - 15:15 e 15:16
  if (hour === 15 && minute === 15) {
    return 'test_15_15';
  }
  
  if (hour === 15 && minute === 16) {
    return 'test_15_16';
  }
  
  // Task mattutino
  if (hour === 8 && minute === 0) {
    return 'morning_task';
  }
  
  // Task pranzo
  if (hour === 12 && minute === 0) {
    return 'lunch_task';
  }
  
  // Test Telegram originali
  if (hour === 14 && minute === 25) {
    return 'telegram_test_1';
  }
  
  if (hour === 14 && minute === 50) {
    return 'telegram_test_2';
  }
  
  if (hour === 14 && minute === 51) {
    return 'telegram_test_3';
  }
  
  // Task pomeridiani
  if (hour === 15 && minute === 0) {
    return 'afternoon_task';
  }
  
  if (hour === 15 && minute === 30) {
    return 'late_afternoon_task';
  }
  
  // Task serali
  if (hour === 19 && minute === 0) {
    return 'evening_task';
  }
  
  if (hour === 20 && minute === 30) {
    return 'night_task';
  }
  
  if (hour === 23 && minute === 30) {
    return 'late_night_task';
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
    case 'test_15_15':
      await test1515(timestamp);
      break;
      
    case 'test_15_16':
      await test1516(timestamp);
      break;
      
    case 'morning_task':
      await morningTask(timestamp);
      break;
      
    case 'lunch_task':
      await lunchTask(timestamp);
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
      await afternoonTask(timestamp);
      break;
      
    case 'late_afternoon_task':
      await lateAfternoonTask(timestamp);
      break;
      
    case 'evening_task':
      await eveningTask(timestamp);
      break;
      
    case 'night_task':
      await nightTask(timestamp);
      break;
      
    case 'late_night_task':
      await lateNightTask(timestamp);
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

// NUOVI TEST PER 15:15 e 15:16
async function test1515(timestamp) {
  console.log('🚀 Test immediato 15:15');
  
  const message = `🚀 TEST IMMEDIATO 15:15
⏰ Orario: 15:15
📅 Data: ${timestamp.toLocaleDateString('it-IT')}
✅ GitHub Actions ha funzionato!

Questo è il test delle 15:15 - Sistema operativo! 🎉`;

  await sendTelegramMessage(TEST_CHAT_ID, message);
}

async function test1516(timestamp) {
  console.log('🎯 Test immediato 15:16');
  
  const message = `🎯 TEST IMMEDIATO 15:16
⏰ Orario: 15:16
📅 Data: ${timestamp.toLocaleDateString('it-IT')}
🔥 Secondo test consecutivo!

Sistema completamente funzionante! 🚀`;

  await sendTelegramMessage(TEST_CHAT_ID, message);
}

// Funzione principale per gestire i diversi task
async function handleTask(taskType, timestamp) {
  console.log(`🚀 Eseguendo task: ${taskType} alle ${timestamp.toISOString()}`);
  
  switch (taskType) {
    case 'morning_task':
      await morningTask(timestamp);
      break;
      
    case 'lunch_task':
      await lunchTask(timestamp);
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
      await afternoonTask(timestamp);
      break;
      
    case 'late_afternoon_task':
      await lateAfternoonTask(timestamp);
      break;
      
    case 'evening_task':
      await eveningTask(timestamp);
      break;
      
    case 'night_task':
      await nightTask(timestamp);
      break;
      
    case 'late_night_task':
      await lateNightTask(timestamp);
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

// Task generale per test e chiamate non programmate
async function generalTask(timestamp) {
  console.log('🔧 Task generale eseguito');
  
  const message = `🔧 Task Generale Eseguito
⏰ Orario: ${timestamp.getHours()}:${timestamp.getMinutes().toString().padStart(2, '0')}
📅 Data: ${timestamp.toLocaleDateString('it-IT')}
🚀 Il sistema GitHub Actions funziona!

Chiamata ricevuta correttamente.`;

  await sendTelegramMessage(TEST_CHAT_ID, message);
}

// Task di test Telegram - MESSAGGI CORRETTI
async function telegramTest1(timestamp) {
  console.log('📱 Test Telegram 1 (14:25)');
  
  const message = `🕰️ Test Cron Job #1
⏰ Orario: 14:25
📅 Data: ${timestamp.toLocaleDateString('it-IT')}
🔄 Il sistema cron sta funzionando correttamente!

Questo è il primo test alle 14:25.`;

  await sendTelegramMessage(TEST_CHAT_ID, message);
}

async function telegramTest2(timestamp) {
  console.log('📱 Test Telegram 2 (14:40)');
  
  const message = `🕰️ Test Cron Job #2
⏰ Orario: 14:40
📅 Data: ${timestamp.toLocaleDateString('it-IT')}
🌅 Pomeriggio! 

Questo è il secondo test alle 14:40.`;

  await sendTelegramMessage(TEST_CHAT_ID, message);
}

async function telegramTest3(timestamp) {
  console.log('📱 Test Telegram 3 (14:41)');
  
  const message = `🕰️ Test Cron Job #3
⏰ Orario: 14:41
📅 Data: ${timestamp.toLocaleDateString('it-IT')}
✅ Test completato con successo!

Questo è il terzo e ultimo test alle 14:41.
Il sistema cron è configurato correttamente! 🎉`;

  await sendTelegramMessage(TEST_CHAT_ID, message);
}

// Task specifici originali
async function morningTask(timestamp) {
  console.log('☀️ Task mattutino (8:00) - Inizio giornata');
  
  await sendTelegramMessage(TEST_CHAT_ID, '☀️ Buongiorno! Il task mattutino è stato eseguito alle 8:00.');
  
  await sendEmail({
    subject: 'Buongiorno! Riepilogo della giornata',
    content: 'La giornata è iniziata. Controlla gli aggiornamenti.',
  });
  
  await updateDailyStats();
}

async function lunchTask(timestamp) {
  console.log('🍽️ Task pranzo (12:00)');
  
  await sendTelegramMessage(TEST_CHAT_ID, '🍽️ Task pranzo eseguito alle 12:00.');
}

async function afternoonTask(timestamp) {
  console.log('🌅 Task pomeridiano (15:00)');
  
  await sendTelegramMessage(TEST_CHAT_ID, '🌅 Task pomeridiano eseguito alle 15:00.');
  await processMidDayData();
}

async function lateAfternoonTask(timestamp) {
  console.log('🌆 Task tardo pomeriggio (15:30)');
  
  await sendTelegramMessage(TEST_CHAT_ID, '🌆 Task del tardo pomeriggio eseguito alle 15:30.');
  await prepareEndOfDayReport();
}

async function eveningTask(timestamp) {
  console.log('🌃 Task serale (19:00)');
  
  await sendTelegramMessage(TEST_CHAT_ID, '🌃 Task serale eseguito alle 19:00.');
  await backupDailyData();
}

async function nightTask(timestamp) {
  console.log('🌙 Task notturno (20:30)');
  
  await sendTelegramMessage(TEST_CHAT_ID, '🌙 Task notturno eseguito alle 20:30.');
  await cleanupAndOptimize();
}

async function lateNightTask(timestamp) {
  console.log('🌌 Task tarda notte (23:30)');
  
  await sendTelegramMessage(TEST_CHAT_ID, '🌌 Task di tarda notte eseguito alle 23:30.');
  await prepareForNextDay();
}

async function sundayEndTask(timestamp) {
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

async function updateDailyStats() {
  try {
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
}

async function prepareEndOfDayReport() {
  console.log('📋 Preparazione report fine giornata...');
}

async function backupDailyData() {
  console.log('💾 Backup dati giornalieri...');
}

async function cleanupAndOptimize() {
  console.log('🧹 Pulizia e ottimizzazione...');
}

async function prepareForNextDay() {
  console.log('🗓️ Preparazione per domani...');
}

async function generateWeeklyReport() {
  console.log('📈 Generazione report settimanale...');
}

// Utility function
function getDayName(dayIndex) {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return days[dayIndex];
}