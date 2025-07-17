import { createClient } from '@libsql/client/web';
import crypto from 'crypto';

// Configurazione con validazione
const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim()
};

if (!config.url || !config.authToken) {
  console.error("Mancano le variabili d'ambiente per il DB!");
  throw new Error("Configurazione database mancante");
}

const client = createClient(config);

// Funzione per hashare la password
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Verifica sessione
async function verifySession(sessionToken) {
  try {
    const result = await client.execute({
      sql: `SELECT s.user_id, u.level, u.name, u.surname 
            FROM sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = ? AND s.expires_at > datetime('now')`,
      args: [sessionToken]
    });
    return result.rows[0] || null;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
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
    // Test connessione DB
    await client.execute("SELECT 1");
    
    const { name, surname, tel, level, password } = req.body;
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({ error: 'Token di sessione richiesto' });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Sessione non valida o scaduta' });
    }

    if (session.level >= 2) {
      return res.status(403).json({ error: 'Permessi insufficienti' });
    }

    // Validazione input
    if (!name?.trim() || !surname?.trim() || !tel?.trim() || !password) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    const levelNum = parseInt(level);
    if (isNaN(levelNum) || levelNum < 0 || levelNum > 2) {
      return res.status(400).json({ error: 'Livello non valido' });
    }

    // Validazione telefono
    const { rows } = await client.execute({
      sql: 'SELECT id FROM users WHERE tel = ?',
      args: [tel.trim()]
    });

    if (rows.length > 0) {
      return res.status(400).json({ error: 'Telefono già registrato' });
    }

    // Creazione utente
    const salt = tel.trim();
    const passwordHash = hashPassword(password, salt);

    const result = await client.execute({
      sql: `INSERT INTO users (name, surname, tel, level, password_hash, salt) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        name.trim(),
        surname.trim(),
        tel.trim(),
        levelNum,
        passwordHash,
        salt
      ]
    });

    const newUser = await client.execute({
      sql: 'SELECT id, name, surname, tel, level, created_at FROM users WHERE id = ?',
      args: [result.lastInsertRowid]
    });

    return res.status(201).json({
      success: true,
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Errore interno',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}