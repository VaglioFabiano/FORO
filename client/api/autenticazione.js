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

// Handler per il login
async function handleLogin(req, res) {
  try {
    const { username, password } = req.body;

    // Validazione input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Username e password sono obbligatori' 
      });
    }

    // Trova l'utente usando lo username
    const userResult = await client.execute({
      sql: 'SELECT id, name, surname, username, tel, level, password_hash, salt FROM users WHERE username = ?',
      args: [username]
    });

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenziali non valide' 
      });
    }

    const user = userResult.rows[0];

    // Verifica la password
    const inputHash = hashPassword(password, user.salt);
    if (inputHash !== user.password_hash) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenziali non valide' 
      });
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
      username: user.username,
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
      success: false,
      error: 'Errore durante il login',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Handler per il logout
async function handleLogout(req, res) {
  try {
    const { sessionToken } = req.body;

    // Il logout è principalmente client-side (localStorage),
    // ma possiamo fare cleanup se necessario
    console.log('Logout richiesto per token:', sessionToken);

    return res.status(200).json({ 
      success: true, 
      message: 'Logout effettuato con successo'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Errore durante il logout',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Handler principale
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    // Test connessione DB
    await client.execute("SELECT 1");
    
    // Determina se è login o logout dal body della richiesta
    const { username, password, sessionToken, action } = req.body;
    
    // Se c'è username e password, è un login
    if (username && password) {
      return await handleLogin(req, res);
    }
    // Se c'è sessionToken o action è "logout", è un logout  
    else if (sessionToken || action === 'logout') {
      return await handleLogout(req, res);
    }
    // Se c'è il parametro action nel body
    else if (action === 'login') {
      return await handleLogin(req, res);
    }
    else {
      return res.status(400).json({
        success: false,
        error: 'Parametri richiesta non validi. Specificare username/password per login o sessionToken per logout'
      });
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Errore di connessione al database',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}