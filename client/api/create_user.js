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

// Nuova funzione per verificare l'utente basata sui dati del token temporaneo
async function verifyUser(tempToken) {
  try {
    // Decodifica il token temporaneo
    const decoded = JSON.parse(atob(tempToken));
    const { userId, tel, timestamp } = decoded;
    
    // Verifica che il timestamp non sia troppo vecchio (es. massimo 1 ora)
    const now = new Date().getTime();
    const tokenAge = now - parseInt(timestamp);
    const maxAge = 60 * 60 * 1000; // 1 ora
    
    if (tokenAge > maxAge) {
      return null;
    }
    
    // Verifica che l'utente esista e abbia i permessi
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
    const tempToken = req.headers.authorization?.replace('Bearer ', '');

    if (!tempToken) {
      return res.status(401).json({ error: 'Token di autenticazione richiesto' });
    }

    const user = await verifyUser(tempToken);
    if (!user) {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }

    if (user.level >= 2) {
      return res.status(403).json({ error: 'Permessi insufficienti' });
    }

    // Validazione input
    if (!name?.trim() || !surname?.trim() || !tel?.trim() || !password) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    const levelNum = parseInt(level);
    if (isNaN(levelNum) || levelNum < 0 || levelNum > 3) {
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