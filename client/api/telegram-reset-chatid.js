// /api/telegram-reset-chatid.js
import { createClient } from '@libsql/client/web';

const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim()
};

const client = createClient(config);

async function verifyUser(tempToken) {
  try {
    const decoded = JSON.parse(atob(tempToken));
    const { userId, tel, timestamp } = decoded;
    
    const now = new Date().getTime();
    const tokenAge = now - parseInt(timestamp);
    const maxAge = 60 * 60 * 1000;
    
    if (tokenAge > maxAge) {
      return null;
    }
    
    const result = await client.execute({
      sql: `SELECT id, level, name, surname, tel FROM users WHERE id = ? AND tel = ?`,
      args: [userId, tel]
    });
    
    return result.rows[0] || null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['POST', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tempToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!tempToken) {
      return res.status(401).json({ error: 'Token richiesto' });
    }

    const user = await verifyUser(tempToken);
    if (!user) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    if (req.method === 'DELETE') {
      // Cancella il chat_id salvato per l'utente corrente
      await client.execute({
        sql: `UPDATE users SET telegram_chat_id = NULL WHERE id = ?`,
        args: [user.id]
      });

      return res.status(200).json({
        success: true,
        message: 'Chat ID cancellato. Ora dovrai condividere nuovamente il tuo contatto con il bot.'
      });
    }

    if (req.method === 'POST') {
      // Imposta manualmente un chat_id (solo per debug/admin)
      const { chatId } = req.body;
      
      if (!chatId) {
        return res.status(400).json({ error: 'Chat ID richiesto' });
      }

      // Solo livelli 0 e 1 possono impostare manualmente un chat_id
      if (user.level > 1) {
        return res.status(403).json({ error: 'Permessi insufficienti' });
      }

      await client.execute({
        sql: `UPDATE users SET telegram_chat_id = ? WHERE id = ?`,
        args: [parseInt(chatId), user.id]
      });

      return res.status(200).json({
        success: true,
        message: `Chat ID ${chatId} associato all'utente ${user.name} ${user.surname}`
      });
    }

  } catch (error) {
    console.error('Reset error:', error);
    return res.status(500).json({
      error: 'Errore interno',
      details: error.message
    });
  }
}