// /api/telegram-debug.js
import { createClient } from "@libsql/client/web";

const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
};

const client = createClient(config);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function verifyUser(tempToken) {
  try {
    const decoded = JSON.parse(atob(tempToken));
    const { userId, tel, timestamp } = decoded;
    const now = new Date().getTime();
    const tokenAge = now - parseInt(timestamp);
    const maxAge = 60 * 60 * 1000;

    if (tokenAge > maxAge) return null;

    const result = await client.execute({
      sql: `SELECT id, level, name, surname, tel FROM users WHERE id = ? AND tel = ?`,
      args: [userId, tel],
    });

    return result.rows[0] || null;
  } catch (error) {
    return null;
  }
}

// --- NUOVE FUNZIONI PER NOTIFICHE ---

async function addNotifica(userId, tipo) {
  return await client.execute({
    sql: `INSERT INTO notifiche_turni (user_id, tipo_notifica) VALUES (?, ?) 
          ON CONFLICT(user_id, tipo_notifica) DO UPDATE SET attiva = 1`,
    args: [userId, tipo || "promemoria"],
  });
}

async function removeNotifica(userId, tipo) {
  return await client.execute({
    sql: `DELETE FROM notifiche_turni WHERE user_id = ? AND tipo_notifica = ?`,
    args: [userId, tipo],
  });
}

async function getNotificheUtente(userId) {
  const result = await client.execute({
    sql: `SELECT * FROM notifiche_turni WHERE user_id = ?`,
    args: [userId],
  });
  return result.rows;
}

// --- HANDLER PRINCIPALE ---

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const tempToken = req.headers.authorization?.replace("Bearer ", "");
    if (!tempToken) return res.status(401).json({ error: "Token richiesto" });

    const user = await verifyUser(tempToken);
    if (!user) return res.status(401).json({ error: "Token non valido" });

    // --- GESTIONE AZIONI NOTIFICHE (POST) ---
    if (req.method === "POST") {
      const { action, tipo_notifica } = req.body;

      if (action === "add_notifica") {
        await addNotifica(user.id, tipo_notifica);
        return res
          .status(200)
          .json({ success: true, message: "Notifica aggiunta" });
      }

      if (action === "remove_notifica") {
        await removeNotifica(user.id, tipo_notifica);
        return res
          .status(200)
          .json({ success: true, message: "Notifica rimossa" });
      }
    }

    // --- LOGICA DEBUG ORIGINALE (GET) ---
    if (req.method === "GET") {
      const botInfoResponse = await fetch(`${TELEGRAM_API_URL}/getMe`);
      const botInfo = await botInfoResponse.json();

      const updatesResponse = await fetch(
        `${TELEGRAM_API_URL}/getUpdates?limit=10&offset=-10`,
      );
      const updatesData = await updatesResponse.json();

      const cachedResult = await client.execute({
        sql: `SELECT telegram_chat_id FROM users WHERE tel = ?`,
        args: [user.tel],
      });

      // Recupera le notifiche attive per il debug
      const notificheAttive = await getNotificheUtente(user.id);

      const debugInfo = {
        user: { ...user },
        notifiche: notificheAttive,
        bot: {
          info: botInfo.ok ? botInfo.result : "Errore bot",
          username: botInfo.ok ? botInfo.result.username : null,
        },
        database: {
          savedChatId: cachedResult.rows[0]?.telegram_chat_id || null,
        },
        telegram: {
          updatesCount: updatesData.ok ? updatesData.result.length : 0,
          lastUpdates: updatesData.ok
            ? updatesData.result.map((u) => ({
                chatId: u.message?.chat?.id,
                text: u.message?.text,
                date: u.message?.date
                  ? new Date(u.message.date * 1000).toISOString()
                  : null,
              }))
            : [],
        },
      };

      return res.status(200).json(debugInfo);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ error: "Errore interno", details: error.message });
  }
}
