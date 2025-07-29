// /api/send-telegram.js
import { createClient } from '@libsql/client/web';

// Configurazione database (stesso del tuo file esistente)
const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim()
};

if (!config.url || !config.authToken) {
  console.error("Mancano le variabili d'ambiente per il DB!");
  throw new Error("Configurazione database mancante");
}

const client = createClient(config);

// Token bot Telegram
const TELEGRAM_BOT_TOKEN = '7608037480:AAGkJbIf02G98dTEnREBhfjI2yna5-Y1pzc';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Funzione per verificare l'utente basata sui dati del token temporaneo
async function verifyUser(tempToken) {
  try {
    const decoded = JSON.parse(atob(tempToken));
    const { userId, tel, timestamp } = decoded;
    
    // Verifica che il timestamp non sia troppo vecchio (1 ora)
    const now = new Date().getTime();
    const tokenAge = now - parseInt(timestamp);
    const maxAge = 60 * 60 * 1000; // 1 ora
    
    if (tokenAge > maxAge) {
      return null;
    }
    
    // Verifica che l'utente esista
    const result = await client.execute({
      sql: `SELECT id, level, name, surname, tel FROM users WHERE id = ? AND tel = ?`,
      args: [userId, tel]
    });
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Funzione per ottenere il chat_id da un numero di telefono
async function getChatIdByPhone(phoneNumber) {
  try {
    // Prima prova a cercare nella cache locale (database)
    const cachedResult = await client.execute({
      sql: `SELECT telegram_chat_id FROM users WHERE tel = ? AND telegram_chat_id IS NOT NULL`,
      args: [phoneNumber]
    });
    
    if (cachedResult.rows.length > 0 && cachedResult.rows[0].telegram_chat_id) {
      return cachedResult.rows[0].telegram_chat_id;
    }
    
    // Se non c'è in cache, tenta di ottenere gli aggiornamenti recenti
    const updatesResponse = await fetch(`${TELEGRAM_API_URL}/getUpdates?limit=100&offset=-100`);
    const updatesData = await updatesResponse.json();
    
    if (!updatesData.ok) {
      console.error('Errore Telegram API:', updatesData);
      throw new Error('Errore nell\'ottenere gli aggiornamenti Telegram: ' + updatesData.description);
    }
    
    console.log(`Trovati ${updatesData.result.length} aggiornamenti Telegram`);
    
    // Cerca tra gli aggiornamenti
    for (const update of updatesData.result.reverse()) { // Inizia dai più recenti
      // Controlla contatti condivisi
      if (update.message && update.message.contact) {
        const contact = update.message.contact;
        const normalizedContactPhone = contact.phone_number.replace(/[^\d+]/g, '');
        const normalizedSearchPhone = phoneNumber.replace(/[^\d+]/g, '');
        
        console.log(`Confronto: ${normalizedContactPhone} vs ${normalizedSearchPhone}`);
        
        if (normalizedContactPhone === normalizedSearchPhone || 
            normalizedContactPhone.includes(normalizedSearchPhone.slice(-8)) ||
            normalizedSearchPhone.includes(normalizedContactPhone.slice(-8))) {
          
          const chatId = update.message.chat.id;
          console.log(`Chat ID trovato tramite contatto: ${chatId}`);
          
          // Salva il chat_id nel database per uso futuro
          await client.execute({
            sql: `UPDATE users SET telegram_chat_id = ? WHERE tel = ?`,
            args: [chatId, phoneNumber]
          });
          
          return chatId;
        }
      }
      
      // Controlla messaggi privati (qualsiasi messaggio da chat private)
      if (update.message && update.message.chat && update.message.chat.type === 'private') {
        const chatId = update.message.chat.id;
        const firstName = update.message.from?.first_name || '';
        const lastName = update.message.from?.last_name || '';
        const username = update.message.from?.username || '';
        
        console.log(`Messaggio privato da: ${firstName} ${lastName} (@${username}), Chat ID: ${chatId}`);
        
        // Se è l'unico aggiornamento recente da chat private, potrebbe essere quello giusto
        // Salviamo temporaneamente questo chat_id
        if (updatesData.result.filter(u => u.message?.chat?.type === 'private').length === 1) {
          console.log(`Unico messaggio privato trovato, assumo sia dell'utente: ${chatId}`);
          
          await client.execute({
            sql: `UPDATE users SET telegram_chat_id = ? WHERE tel = ?`,
            args: [chatId, phoneNumber]
          });
          
          return chatId;
        }
      }
    }
    
    console.log('Nessun chat_id trovato negli aggiornamenti');
    return null;
  } catch (error) {
    console.error('Errore nell\'ottenere chat_id:', error);
    return null;
  }
}

// Funzione per inviare messaggio Telegram
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
    
    return data.result;
  } catch (error) {
    console.error('Errore invio messaggio Telegram:', error);
    throw error;
  }
}

// Funzione per salvare il log del messaggio
async function logMessage(userId, phoneNumber, message, success, messageId = null, error = null) {
  try {
    await client.execute({
      sql: `INSERT INTO telegram_messages (user_id, phone_number, message, success, telegram_message_id, error_message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [userId, phoneNumber, message, success ? 1 : 0, messageId, error]
    });
  } catch (error) {
    console.error('Errore nel salvare il log:', error);
  }
}

// Crea la tabella per i log se non esiste
async function ensureTelegramMessagesTable() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS telegram_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        phone_number TEXT NOT NULL,
        message TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 0,
        telegram_message_id INTEGER,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
    
    // Aggiungi colonna telegram_chat_id alla tabella users se non esiste
    await client.execute(`
      ALTER TABLE users ADD COLUMN telegram_chat_id INTEGER
    `).catch(() => {
      // Ignora l'errore se la colonna esiste già
    });
    
  } catch (error) {
    console.error('Errore nella creazione delle tabelle:', error);
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Assicurati che le tabelle esistano
    await ensureTelegramMessagesTable();
    
    // Test connessione DB
    await client.execute("SELECT 1");
    
    const { phoneNumber, message } = req.body;
    const tempToken = req.headers.authorization?.replace('Bearer ', '');

    // Validazione token
    if (!tempToken) {
      return res.status(401).json({ error: 'Token di autenticazione richiesto' });
    }

    const user = await verifyUser(tempToken);
    if (!user) {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }

    // Controlla i permessi (livello 2 = minimo per inviare messaggi Telegram)
    if (user.level > 2) {
      return res.status(403).json({ error: 'Permessi insufficienti per inviare messaggi Telegram' });
    }

    // Validazione input
    if (!phoneNumber?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Numero di telefono e messaggio sono obbligatori' });
    }

    // Verifica che il numero corrisponda all'utente loggato
    if (phoneNumber.trim() !== user.tel) {
      return res.status(403).json({ error: 'Puoi inviare messaggi solo al tuo numero di telefono' });
    }

    // Ottieni il chat_id per il numero di telefono
    const chatId = await getChatIdByPhone(phoneNumber.trim());
    
    if (!chatId) {
      // Log del fallimento
      await logMessage(user.id, phoneNumber.trim(), message.trim(), false, null, 'Chat ID non trovato');
      
      return res.status(404).json({ 
        error: 'Non è stato possibile trovare una chat Telegram associata a questo numero. Assicurati di aver avviato una conversazione con il bot @YourBotName e di aver condiviso il tuo contatto.' 
      });
    }

    try {
      // Invia il messaggio
      const result = await sendTelegramMessage(chatId, message.trim());
      
      // Log del successo
      await logMessage(user.id, phoneNumber.trim(), message.trim(), true, result.message_id);
      
      return res.status(200).json({
        success: true,
        message: 'Messaggio inviato con successo',
        messageId: result.message_id,
        chatId: chatId
      });
      
    } catch (telegramError) {
      // Log del fallimento
      await logMessage(user.id, phoneNumber.trim(), message.trim(), false, null, telegramError.message);
      
      return res.status(500).json({
        error: 'Errore nell\'invio del messaggio Telegram: ' + telegramError.message
      });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Errore interno del server',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}