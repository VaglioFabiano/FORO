import { createClient } from '@libsql/client';
import crypto from 'crypto';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Funzione per hashare la password (stessa del login)
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Funzione per verificare la validità del token di sessione
async function verifySession(sessionToken) {
  try {
    const result = await client.execute({
      sql: `SELECT s.user_id, u.level, u.name, u.surname 
            FROM sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = ? AND s.expires_at > datetime('now')`,
      args: [sessionToken]
    });

    return result.rows.length > 0 ? result.rows[0] : null;
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
    const { name, surname, tel, level, password } = req.body;
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    // Verifica che l'utente sia autenticato
    if (!sessionToken) {
      return res.status(401).json({ error: 'Token di sessione richiesto' });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Sessione non valida o scaduta' });
    }

    // Verifica che l'utente abbia i permessi per creare utenti (level < 2)
    if (session.level >= 2) {
      return res.status(403).json({ error: 'Permessi insufficienti per creare utenti' });
    }

    // Validazione input
    if (!name || !surname || !tel || level === undefined || !password) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    // Validazione livello
    if (![0, 1, 2].includes(parseInt(level))) {
      return res.status(400).json({ error: 'Livello non valido' });
    }

    // Validazione telefono (deve essere unico)
    const existingUser = await client.execute({
      sql: 'SELECT id FROM users WHERE tel = ?',
      args: [tel]
    });

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Numero di telefono già registrato' });
    }

    // Genera salt usando il nome utente (telefono) come nel login
    const salt = tel;
    const passwordHash = hashPassword(password, salt);

    // Crea il nuovo utente
    const result = await client.execute({
      sql: `INSERT INTO users (name, surname, tel, level, password_hash, salt) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [name, surname, tel, parseInt(level), passwordHash, salt]
    });

    // Recupera l'utente appena creato
    const newUser = await client.execute({
      sql: 'SELECT id, name, surname, tel, level, created_at FROM users WHERE id = ?',
      args: [result.lastInsertRowid]
    });

    const userResponse = {
      id: newUser.rows[0].id,
      name: newUser.rows[0].name,
      surname: newUser.rows[0].surname,
      tel: newUser.rows[0].tel,
      level: newUser.rows[0].level,
      created_at: newUser.rows[0].created_at
    };

    return res.status(201).json({
      success: true,
      message: 'Utente creato con successo',
      user: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      error: 'Errore durante la creazione dell\'utente',
      details: error.message
    });
  }
}