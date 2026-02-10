import { createClient } from "@libsql/client/web";

const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
};

if (!config.url || !config.authToken) {
  throw new Error("Configurazione database mancante");
}

const client = createClient(config);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// --- FUNZIONI DI UTILITÀ ---

async function verifyUser(tempToken) {
  try {
    const decoded = JSON.parse(atob(tempToken));
    const { userId, tel, timestamp } = decoded;
    const now = new Date().getTime();
    if (now - parseInt(timestamp) > 60 * 60 * 1000) return null;

    const result = await client.execute({
      sql: `SELECT id, level, name, surname, tel FROM users WHERE id = ? AND tel = ?`,
      args: [userId, tel],
    });
    return result.rows[0] || null;
  } catch (error) {
    return null;
  }
}

async function getChatIdByPhone(phoneNumber) {
  try {
    const cachedResult = await client.execute({
      sql: `SELECT telegram_chat_id FROM users WHERE tel = ? AND telegram_chat_id IS NOT NULL`,
      args: [phoneNumber],
    });
    if (cachedResult.rows.length > 0)
      return cachedResult.rows[0].telegram_chat_id;

    const updatesResponse = await fetch(
      `${TELEGRAM_API_URL}/getUpdates?limit=100&offset=-100`,
    );
    const updatesData = await updatesResponse.json();
    if (!updatesData.ok) return null;

    let foundChatId = null;
    for (const update of updatesData.result.reverse()) {
      if (update.message?.contact) {
        const contact = update.message.contact;
        const normContact = contact.phone_number.replace(/[^\d+]/g, "");
        const normSearch = phoneNumber.replace(/[^\d+]/g, "");
        if (
          normContact === normSearch ||
          normContact.slice(-8) === normSearch.slice(-8)
        ) {
          foundChatId = update.message.chat.id;
          break;
        }
      }
    }

    if (foundChatId) {
      await client.execute({
        sql: `UPDATE users SET telegram_chat_id = ? WHERE tel = ?`,
        args: [foundChatId, phoneNumber],
      });
    }
    return foundChatId;
  } catch (error) {
    return null;
  }
}

async function sendTelegramMessage(chatId, message) {
  const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || "Errore invio Telegram");
  return data.result;
}

async function logMessage(
  userId,
  phoneNumber,
  message,
  success,
  messageId = null,
  error = null,
) {
  try {
    await client.execute({
      sql: `INSERT INTO telegram_messages (user_id, phone_number, message, success, telegram_message_id, error_message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [userId, phoneNumber, message, success ? 1 : 0, messageId, error],
    });
  } catch (e) {
    console.error("Log error:", e);
  }
}

async function ensureTelegramMessagesTable() {
  try {
    await client.execute(
      `CREATE TABLE IF NOT EXISTS telegram_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, phone_number TEXT NOT NULL, message TEXT NOT NULL, success INTEGER NOT NULL DEFAULT 0, telegram_message_id INTEGER, error_message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    );
    await client
      .execute(`ALTER TABLE users ADD COLUMN telegram_chat_id INTEGER`)
      .catch(() => {});
  } catch (e) {}
}

// --- HANDLER UNIFICATO ---

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    await ensureTelegramMessagesTable();
    const { phoneNumber, chatId, message } = req.body;

    // 1. LOGICA GRUPPO (se chatId è presente)
    if (chatId) {
      if (!message?.trim())
        return res.status(400).json({ error: "Messaggio vuoto" });

      const result = await sendTelegramMessage(chatId, message.trim());
      return res.status(200).json({
        success: true,
        messageId: result.message_id,
      });
    }

    // 2. LOGICA SINGOLO (se c'è phoneNumber)
    if (phoneNumber) {
      const tempToken = req.headers.authorization?.replace("Bearer ", "");
      if (!tempToken) return res.status(401).json({ error: "Token richiesto" });

      const user = await verifyUser(tempToken);
      if (!user) return res.status(401).json({ error: "Token scaduto" });
      if (user.level > 2)
        return res.status(403).json({ error: "Permessi insufficienti" });
      if (phoneNumber.trim() !== user.tel)
        return res.status(403).json({ error: "Numero non corrispondente" });

      const targetChatId = await getChatIdByPhone(phoneNumber.trim());
      if (!targetChatId)
        return res
          .status(404)
          .json({ error: "Chat non trovata. Condividi contatto col bot." });

      try {
        const result = await sendTelegramMessage(targetChatId, message.trim());
        await logMessage(
          user.id,
          phoneNumber.trim(),
          message.trim(),
          true,
          result.message_id,
        );
        return res
          .status(200)
          .json({ success: true, messageId: result.message_id });
      } catch (err) {
        await logMessage(
          user.id,
          phoneNumber.trim(),
          message.trim(),
          false,
          null,
          err.message,
        );
        throw err;
      }
    }

    return res
      .status(400)
      .json({ error: "Dati mancanti (chatId o phoneNumber)" });
  } catch (error) {
    console.error("Handler Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
