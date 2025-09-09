// /api/send-telegram.js
import { createClient } from '@libsql/client/web';

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
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ---------------- FUNZIONI ----------------

// Verifica utente da token
async function verifyUser(tempToken) {
  try {
    const decoded = JSON.parse(atob(tempToken));
    const { userId, tel, timestamp } = decoded;

    const now = Date.now();
    if (now - parseInt(timestamp) > 60 * 60 * 1000) return null; // 1 ora

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

// Recupera chat_id da numero di telefono
async function getChatIdByPhone(phoneNumber) {
  const cached = await client.execute({
    sql: `SELECT telegram_chat_id FROM users WHERE tel = ? AND telegram_chat_id IS NOT NULL`,
    args: [phoneNumber]
  });

  if (cached.rows.length > 0) return cached.rows[0].telegram_chat_id;

  const updates = await fetch(`${TELEGRAM_API_URL}/getUpdates?limit=100`);
  const data = await updates.json();
  if (!data.ok) return null;

  const normalizedSearch = phoneNumber.replace(/[^\d+]/g, '');
  for (const update of data.result.reverse()) {
    if (update.message?.contact) {
      const normalizedContact = update.message.contact.phone_number.replace(/[^\d+]/g, '');
      if (
        normalizedContact === normalizedSearch ||
        normalizedContact.slice(-8) === normalizedSearch.slice(-8)
      ) {
        const chatId = update.message.chat.id;
        await client.execute({
          sql: `UPDATE users SET telegram_chat_id = ? WHERE tel = ?`,
          args: [chatId, phoneNumber]
        });
        return chatId;
      }
    }
  }
  return null;
}

// Invio messaggio
async function sendTelegramMessage(chatId, message) {
  const res = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    })
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'Errore invio Telegram');
  return data.result;
}

// Log messaggio
async function logMessage(userId, target, message, success, messageId = null, error = null) {
  await client.execute({
    sql: `INSERT INTO telegram_messages (user_id, phone_number, message, success, telegram_message_id, error_message, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [userId, target, message, success ? 1 : 0, messageId, error]
  });
}

// Assicura tabelle
async function ensureTables() {
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

  await client.execute(`
    ALTER TABLE users ADD COLUMN telegram_chat_id INTEGER
  `).catch(() => {});
}

// ---------------- HANDLER ----------------

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureTables();
    await client.execute("SELECT 1");

    const { phoneNumber, chatId, message } = req.body;
    const tempToken = req.headers.authorization?.replace('Bearer ', '');

    if (!tempToken) return res.status(401).json({ error: 'Token richiesto' });
    const user = await verifyUser(tempToken);
    if (!user) return res.status(401).json({ error: 'Token non valido o scaduto' });

    if (user.level > 2) return res.status(403).json({ error: 'Permessi insufficienti' });
    if (!message?.trim()) return res.status(400).json({ error: 'Messaggio obbligatorio' });

    let targetChatId = chatId;
    let targetLabel = chatId ? `group:${chatId}` : phoneNumber;

    if (!targetChatId) {
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Specificare phoneNumber o chatId' });
      }
      if (phoneNumber.trim() !== user.tel) {
        return res.status(403).json({ error: 'Puoi inviare solo al tuo numero' });
      }
      targetChatId = await getChatIdByPhone(phoneNumber.trim());
      if (!targetChatId) {
        await logMessage(user.id, phoneNumber, message.trim(), false, null, 'Chat ID non trovato');
        return res.status(404).json({
          error: `Nessun chat_id trovato per ${phoneNumber}. L'utente deve condividere il contatto con il bot.`
        });
      }
    }

    try {
      const result = await sendTelegramMessage(targetChatId, message.trim());
      await logMessage(user.id, targetLabel, message.trim(), true, result.message_id);
      return res.status(200).json({
        success: true,
        message: 'Messaggio inviato con successo',
        messageId: result.message_id,
        chatId: targetChatId
      });
    } catch (err) {
      await logMessage(user.id, targetLabel, message.trim(), false, null, err.message);
      return res.status(500).json({ error: 'Errore invio Telegram: ' + err.message });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Errore interno server', details: error.message });
  }
}
