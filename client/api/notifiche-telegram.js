import { createClient } from "@libsql/client/web";

const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
};

const client = createClient(config);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// --- FUNZIONI DI SUPPORTO (Helpers) ---

async function getUserInfo(userId) {
  try {
    const result = await client.execute({
      sql: "SELECT name, surname FROM users WHERE id = ?",
      args: [userId],
    });
    return result.rows[0] || null;
  } catch (e) {
    console.error("Errore recupero info utente:", e);
    return null;
  }
}

async function getUserTelegramChatId(userId) {
  try {
    const result = await client.execute({
      sql: "SELECT telegram_chat_id FROM users WHERE id = ?",
      args: [userId],
    });
    return result.rows[0]?.telegram_chat_id || null;
  } catch (e) {
    console.error("Errore recupero chat ID:", e);
    return null;
  }
}

async function sendTelegramMessage(chatId, text) {
  try {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text }),
    });
  } catch (e) {
    console.error("Errore invio Telegram:", e);
  }
}

// --- NUOVA FUNZIONE NOTIFICA GRUPPO ---

async function sendGroupNotification(
  action,
  classeName,
  currentUserId,
  targetUserId,
) {
  try {
    // Se non c'è targetUserId, assumiamo sia l'utente corrente
    const recipientId = targetUserId || currentUserId;

    // Recupera info di chi sta compiendo l'azione (l'admin/current user)
    const currentUserInfo = await getUserInfo(currentUserId);

    if (!currentUserInfo) return;

    let message = "";

    // Logica messaggi
    if (action === "add") {
      if (currentUserId === recipientId) {
        // Auto-iscrizione
        message = `✅ Ti sei iscritto al gruppo di notifica: "${classeName}"`;
      } else {
        // Admin aggiunge utente
        message = `📋 ${currentUserInfo.name} ${currentUserInfo.surname} ti ha aggiunto al gruppo di notifica: "${classeName}"`;
      }
    } else if (action === "remove") {
      if (currentUserId === recipientId) {
        // Auto-rimozione
        message = `❌ Ti sei disiscritto dal gruppo di notifica: "${classeName}"`;
      } else {
        // Admin rimuove utente
        message = `🗑️ ${currentUserInfo.name} ${currentUserInfo.surname} ti ha rimosso dal gruppo di notifica: "${classeName}"`;
      }
    }

    if (!message) return;

    // Recupera Chat ID del destinatario
    const chatId = await getUserTelegramChatId(recipientId);

    if (chatId) {
      await sendTelegramMessage(chatId, message);
      console.log(`Notifica gruppo inviata a ${recipientId}`);
    } else {
      console.log(`Chat ID non trovato per utente ${recipientId}`);
    }
  } catch (error) {
    console.error("Errore sendGroupNotification:", error);
  }
}

// --- FUNZIONI DB & AUTH ---

async function verifyUser(tempToken) {
  try {
    const decoded = JSON.parse(atob(tempToken));
    const { userId, tel, timestamp } = decoded;

    const now = new Date().getTime();
    const tokenAge = now - parseInt(timestamp);
    const maxAge = 60 * 60 * 1000; // 1 ora

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

// MODIFICA: Aggiunto parametro 'descrizione' e colonna nella query
async function addNotifica(userId, tipo, descrizione) {
  return await client.execute({
    sql: `INSERT OR IGNORE INTO notifiche (user_id, tipo_notifica, descrizione) VALUES (?, ?, ?)`,
    args: [userId, tipo || "promemoria", descrizione || ""],
  });
}

async function removeNotifica(userId, tipo) {
  return await client.execute({
    sql: `DELETE FROM notifiche WHERE user_id = ? AND tipo_notifica = ?`,
    args: [userId, tipo],
  });
}

// MODIFICA: Aggiunto 'n.descrizione' alla SELECT
async function getTutteNotifiche() {
  const result = await client.execute({
    sql: `
      SELECT n.id, n.user_id, n.tipo_notifica, n.descrizione, u.name, u.surname 
      FROM notifiche n
      LEFT JOIN users u ON n.user_id = u.id
      ORDER BY n.tipo_notifica, u.surname
    `,
    args: [],
  });
  return result.rows;
}

// --- HANDLER PRINCIPALE ---

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const tempToken = req.headers.authorization?.replace("Bearer ", "");
    if (!tempToken) return res.status(401).json({ error: "Token richiesto" });

    const user = await verifyUser(tempToken);
    if (!user) return res.status(401).json({ error: "Token non valido" });

    // --- GESTIONE AZIONI (POST) ---
    if (req.method === "POST") {
      // MODIFICA: Estrazione di 'descrizione' dal body
      const { action, tipo_notifica, descrizione, userIdOverride } = req.body;

      // Se c'è un override (l'admin aggiunge qualcun altro), usiamo quello, altrimenti l'utente corrente
      const targetUserId = userIdOverride ? parseInt(userIdOverride) : user.id;

      if (!tipo_notifica)
        return res.status(400).json({ error: "Tipo notifica mancante" });

      if (action === "add_notifica") {
        // MODIFICA: Passaggio di 'descrizione' alla funzione DB
        await addNotifica(targetUserId, tipo_notifica, descrizione);

        // --- INVIO NOTIFICA ---
        await sendGroupNotification(
          "add",
          tipo_notifica,
          user.id,
          targetUserId,
        );

        return res
          .status(200)
          .json({ success: true, message: "Utente aggiunto alla classe" });
      }

      if (action === "remove_notifica") {
        await removeNotifica(targetUserId, tipo_notifica);

        // --- INVIO NOTIFICA ---
        await sendGroupNotification(
          "remove",
          tipo_notifica,
          user.id,
          targetUserId,
        );

        return res
          .status(200)
          .json({ success: true, message: "Utente rimosso dalla classe" });
      }
    }

    // --- GESTIONE VISUALIZZAZIONE (GET) ---
    if (req.method === "GET") {
      // 1. Info Bot Telegram
      let botInfo = { ok: false };
      try {
        const botInfoResponse = await fetch(`${TELEGRAM_API_URL}/getMe`);
        botInfo = await botInfoResponse.json();
      } catch (e) {
        console.error("Telegram API Error:", e);
      }

      // 2. Ultimi messaggi (Update)
      let updatesData = { ok: false, result: [] };
      try {
        const updatesResponse = await fetch(
          `${TELEGRAM_API_URL}/getUpdates?limit=10&offset=-10`,
        );
        updatesData = await updatesResponse.json();
      } catch (e) {
        console.error("Telegram Updates Error:", e);
      }

      // 3. Info Database Utente
      const cachedResult = await client.execute({
        sql: `SELECT telegram_chat_id FROM users WHERE tel = ?`,
        args: [user.tel],
      });

      // 4. Elenco COMPLETO notifiche (per popolare la dashboard)
      const notificheAttive = await getTutteNotifiche();

      const debugInfo = {
        user: { ...user },
        notifiche_attive: notificheAttive,
        bot: {
          info: botInfo.ok ? botInfo.result : "Errore API Telegram",
          username: botInfo.ok ? botInfo.result.username : null,
        },
        database: {
          savedChatId: cachedResult.rows[0]?.telegram_chat_id || null,
        },
        telegram: {
          updatesCount: updatesData.ok ? updatesData.result.length : 0,
          lastUpdates: updatesData.ok
            ? updatesData.result.map((update) => ({
                updateId: update.update_id,
                messageId: update.message?.message_id,
                chatId: update.message?.chat?.id,
                chatType: update.message?.chat?.type,
                text:
                  update.message?.text ||
                  (update.message?.contact ? "Contact" : "Media"),
                from: update.message?.from || {},
                date: update.message?.date
                  ? new Date(update.message.date * 1000).toISOString()
                  : null,
              }))
            : [],
        },
      };

      return res.status(200).json(debugInfo);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: "Errore interno server",
      details: error.message,
    });
  }
}
