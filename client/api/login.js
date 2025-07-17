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

// Funzione per generare un token di sessione
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
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
    const { username, password, rememberMe } = req.body;

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
    const inputHash = hashPassword(password, user.salt);
    if (inputHash !== user.password_hash) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // CANCELLA TUTTE LE SESSIONI PRECEDENTI DELLO STESSO UTENTE
    await client.execute({
      sql: 'DELETE FROM sessions WHERE user_id = ?',
      args: [user.id]
    });

    // Genera token di sessione
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    
    // Se "ricordami" è attivo, la sessione dura 30 giorni, altrimenti 1 giorno
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 1);
    }

    // Salva la nuova sessione
    await client.execute({
      sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      args: [sessionToken, user.id, expiresAt.toISOString()]
    });

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
      user: userResponse,
      sessionToken: sessionToken,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Errore durante il login',
      details: error.message
    });
  }
}