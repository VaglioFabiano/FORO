// /api/send-telegram-group.js
import { createClient } from '@libsql/client/web';

// Configurazione database
const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim()
};

console.log('=== CONFIGURAZIONE DATABASE ===');
console.log('URL presente:', !!config.url);
console.log('Auth Token presente:', !!config.authToken);

if (!config.url || !config.authToken) {
  console.error("❌ Mancano le variabili d'ambiente per il DB!");
  throw new Error("Configurazione database mancante");
}

const client = createClient(config);

// Token bot Telegram
const TELEGRAM_BOT_TOKEN = '7608037480:AAGkJbIf02G98dTEnREBhfjI2yna5-Y1pzc';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

console.log('=== CONFIGURAZIONE TELEGRAM ===');
console.log('Bot Token presente:', !!TELEGRAM_BOT_TOKEN);
console.log('API URL:', TELEGRAM_API_URL);

// Funzione per testare il bot Telegram
async function testTelegramBot() {
  try {
    console.log('🔍 Testing Telegram bot...');
    const response = await fetch(`${TELEGRAM_API_URL}/getMe`);
    const data = await response.json();
    
    console.log('Bot test response:', data);
    
    if (data.ok) {
      console.log('✅ Bot is working:', data.result.username);
      return true;
    } else {
      console.error('❌ Bot test failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Bot test error:', error);
    return false;
  }
}

// Funzione per inviare messaggio al gruppo con log dettagliati
async function sendTelegramGroupMessage(chatId, message) {
  console.log('=== INVIO MESSAGGIO GRUPPO ===');
  console.log('Chat ID:', chatId);
  console.log('Messaggio lunghezza:', message.length);
  console.log('Prime 100 caratteri:', message.substring(0, 100));
  
  try {
    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    };
    
    console.log('📤 Payload completo:', JSON.stringify(payload, null, 2));
    
    console.log('🌐 Effettuando richiesta a:', `${TELEGRAM_API_URL}/sendMessage`);
    
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response status text:', response.statusText);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📥 Response data:', JSON.stringify(data, null, 2));
    
    if (!data.ok) {
      console.error('❌ Telegram API error:', data.error_code, data.description);
      console.error('❌ Full error response:', data);
      throw new Error(`Telegram API Error (${data.error_code}): ${data.description}`);
    }
    
    console.log('✅ Messaggio inviato con successo!');
    console.log('✅ Message ID:', data.result.message_id);
    console.log('✅ Chat info:', data.result.chat);
    
    return data.result;
  } catch (error) {
    console.error('💥 Errore completo nell\'invio messaggio:', error);
    console.error('💥 Error stack:', error.stack);
    throw error;
  }
}

// Funzione per salvare il log nel database
async function logGroupMessage(chatId, message, success, messageId = null, error = null) {
  try {
    console.log('💾 Salvando log nel database...');
    
    await client.execute({
      sql: `INSERT INTO telegram_group_messages (chat_id, message, success, telegram_message_id, error_message, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [chatId, message, success ? 1 : 0, messageId, error]
    });
    
    console.log('✅ Log salvato nel database');
  } catch (error) {
    console.error('❌ Errore nel salvare il log:', error);
  }
}

// Crea la tabella per i log se non esiste
async function ensureTelegramGroupMessagesTable() {
  try {
    console.log('🗄️ Verificando/creando tabella telegram_group_messages...');
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS telegram_group_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        message TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 0,
        telegram_message_id INTEGER,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Tabella telegram_group_messages pronta');
  } catch (error) {
    console.error('❌ Errore nella creazione della tabella:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  console.log('=== NUOVA RICHIESTA API ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('Timestamp:', new Date().toISOString());

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    console.log('✅ Responding to OPTIONS request');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔧 Inizializando servizi...');
    
    // Test del bot Telegram
    const botWorking = await testTelegramBot();
    if (!botWorking) {
      console.error('❌ Bot Telegram non funziona');
      return res.status(500).json({ error: 'Bot Telegram non configurato correttamente' });
    }

    // Assicurati che le tabelle esistano
    await ensureTelegramGroupMessagesTable();
    
    // Test connessione DB
    console.log('🗄️ Testing database connection...');
    const dbTest = await client.execute("SELECT 1 as test");
    console.log('✅ Database connection OK:', dbTest.rows);
    
    const { chatId, message } = req.body;
    console.log('📝 Dati ricevuti:');
    console.log('- Chat ID:', chatId, typeof chatId);
    console.log('- Message length:', message?.length);
    console.log('- Message type:', typeof message);

    // Validazione input dettagliata
    if (!chatId) {
      console.error('❌ Chat ID mancante');
      return res.status(400).json({ error: 'Chat ID è obbligatorio' });
    }
    
    if (!message) {
      console.error('❌ Messaggio mancante');
      return res.status(400).json({ error: 'Messaggio è obbligatorio' });
    }
    
    if (!message.trim()) {
      console.error('❌ Messaggio vuoto dopo trim');
      return res.status(400).json({ error: 'Messaggio non può essere vuoto' });
    }

    console.log('✅ Validazione input completata');

    try {
      // Invia il messaggio al gruppo
      console.log('🚀 Iniziando invio messaggio...');
      const result = await sendTelegramGroupMessage(chatId, message.trim());
      
      // Log del successo
      await logGroupMessage(chatId, message.trim(), true, result.message_id);
      
      console.log('🎉 SUCCESSO TOTALE!');
      
      return res.status(200).json({
        success: true,
        message: 'Messaggio inviato con successo al gruppo',
        messageId: result.message_id,
        chatId: chatId,
        timestamp: new Date().toISOString(),
        debug: {
          chatInfo: result.chat,
          messageLength: message.trim().length
        }
      });
      
    } catch (telegramError) {
      console.error('💥 ERRORE TELEGRAM:', telegramError);
      
      // Log del fallimento
      await logGroupMessage(chatId, message.trim(), false, null, telegramError.message);
      
      return res.status(500).json({
        error: 'Errore nell\'invio del messaggio al gruppo',
        details: telegramError.message,
        chatId: chatId,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('💥 ERRORE GENERALE:', error);
    console.error('💥 Stack trace:', error.stack);
    
    return res.status(500).json({
      error: 'Errore interno del server',
      details: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        config: {
          hasDbUrl: !!config.url,
          hasDbToken: !!config.authToken,
          hasTelegramToken: !!TELEGRAM_BOT_TOKEN
        }
      })
    });
  }
}