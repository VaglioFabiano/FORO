import { createClient } from '@libsql/client';
import crypto from 'crypto';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Funzione per hashare la password
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    // Validazione input
    if (!username || !password) {
      return res.status(400).json({ error: 'Nome utente e password sono obbligatori' });
    }

    // Trova l'utente (usa il telefono come username)
    const userResult = await client.execute({
      sql: 'SELECT id, name, surname, tel, level, password_hash, salt FROM users WHERE tel = ?',
      args: [username]
    });

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = userResult.rows[0];

    // Verifica la password
    const inputHash = hashPassword(password, user.password_hash);
    if (inputHash !== user.password_hash) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Aggiorna l'ultimo login
    await client.execute({
      sql: 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      args: [user.id]
    });

    // Rimuovi dati sensibili dalla risposta
    const userResponse = {
      id: user.id,
      name: user.name,
      surname: user.surname,
      tel: user.tel,
      level: user.level
    };

    return res.status(200).json({ 
      success: true, 
      message: 'Login effettuato con successo',
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Errore durante il login',
      details: error.message
    });
  }
}