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

// Funzione per generare un salt
function generateSalt() {
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
    const { name, surname, tel, level, password } = req.body;

    // Validazione input
    if (!name || !surname || !tel || !level || !password) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La password deve essere di almeno 6 caratteri' });
    }

    // Controlla se l'utente esiste già
    const existingUser = await client.execute({
      sql: 'SELECT id FROM users WHERE tel = ?',
      args: [tel]
    });

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Un utente con questo numero di telefono esiste già' });
    }

    // Genera salt e hash della password
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    // Inserisci il nuovo utente
    const result = await client.execute({
      sql: `INSERT INTO users (name, surname, tel, level, password_hash, salt) 
            VALUES (?, ?, ?, ?, ?, ?) RETURNING id, name, surname, tel, level`,
      args: [name, surname, tel, level, passwordHash, salt]
    });

    const newUser = result.rows[0];

    return res.status(201).json({ 
      success: true, 
      message: 'Utente registrato con successo',
      user: {
        id: newUser.id,
        name: newUser.name,
        surname: newUser.surname,
        tel: newUser.tel,
        level: newUser.level
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'Errore durante la registrazione',
      details: error.message
    });
  }
}