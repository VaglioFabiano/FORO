import { createClient } from '@libsql/client/web';
import crypto from 'crypto';

// Configurazione con validazione e logging
const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim()
};

console.log('Configurazione database:', {
  hasUrl: !!config.url,
  hasToken: !!config.authToken,
  urlLength: config.url?.length || 0,
  tokenLength: config.authToken?.length || 0
});

if (!config.url || !config.authToken) {
  console.error("Mancano le variabili d'ambiente per il DB!");
  console.error("TURSO_DATABASE_URL presente:", !!process.env.TURSO_DATABASE_URL);
  console.error("TURSO_AUTH_TOKEN presente:", !!process.env.TURSO_AUTH_TOKEN);
  throw new Error("Configurazione database mancante");
}

const client = createClient(config);
console.log('Client database creato con successo');

// Funzione per hashare la password
function hashPassword(password, salt) {
  try {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  } catch (error) {
    console.error('Errore durante l\'hashing della password:', error);
    throw new Error('Errore nella generazione della password');
  }
}

// Handler per creare un nuovo utente (POST)
async function createUser(req, res) {
  try {
    const { name, surname, tel, level, password } = req.body;

    // Validazione input
    if (!name?.trim() || !surname?.trim() || !tel?.trim() || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tutti i campi sono obbligatori' 
      });
    }

    const levelNum = parseInt(level);
    if (isNaN(levelNum)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Livello non valido' 
      });
    }

    // Validazione telefono univoco
    const existingUser = await client.execute({
      sql: 'SELECT id FROM users WHERE tel = ?',
      args: [tel.trim()]
    });

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Telefono già registrato' 
      });
    }

    // Creazione utente
    const salt = tel.trim();
    const passwordHash = hashPassword(password, salt);

    const result = await client.execute({
      sql: `INSERT INTO users (name, surname, tel, level, password_hash, salt)
            VALUES (?, ?, ?, ?, ?, ?) RETURNING id, name, surname, tel, level, created_at`,
      args: [
        name.trim(),
        surname.trim(),
        tel.trim(),
        levelNum,
        passwordHash,
        salt
      ]
    });

    return res.status(201).json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Errore nella creazione utente:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Handler per ottenere tutti gli utenti (GET)
async function getUsers(req, res) {
  try {
    console.log('Tentativo di recupero utenti...');
    
    // Query molto semplice per iniziare
    const result = await client.execute('SELECT * FROM users');
    
    console.log('Query eseguita, numero righe:', result.rows.length);
    
    // Controlliamo se ci sono dati e come sono strutturati
    if (result.rows.length > 0) {
      console.log('Prima riga:', JSON.stringify(result.rows[0], null, 2));
    }

    // Trasformiamo i dati per essere sicuri della struttura
    const users = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      surname: row.surname,
      tel: row.tel,
      level: row.level,
      created_at: row.created_at,
      last_login: row.last_login,
      telegram_chat_id: row.telegram_chat_id
    }));

    console.log('Utenti trasformati:', users.length);

    return res.status(200).json({
      success: true,
      users: users,
      count: users.length
    });

  } catch (error) {
    console.error('Errore dettagliato nel recupero utenti:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      details: error.message
    });
  }
}

// Handler per aggiornare un utente (PUT)
async function updateUser(req, res) {
  try {
    const { id, name, surname, tel, level, password } = req.body;

    if (!id || !name?.trim() || !surname?.trim() || !tel?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dati mancanti' 
      });
    }

    const levelNum = parseInt(level);
    if (isNaN(levelNum)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Livello non valido' 
      });
    }

    // Verifica esistenza utente
    const targetUser = await client.execute({
      sql: 'SELECT id, level, tel FROM users WHERE id = ?',
      args: [id]
    });

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Utente non trovato' 
      });
    }

    // Verifica telefono univoco (solo se è diverso da quello attuale)
    if (tel.trim() !== targetUser.rows[0].tel) {
      const telCheck = await client.execute({
        sql: 'SELECT id FROM users WHERE tel = ? AND id != ?',
        args: [tel.trim(), id]
      });

      if (telCheck.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Telefono già registrato' 
        });
      }
    }

    // Costruzione query dinamica
    let updateSql = 'UPDATE users SET name = ?, surname = ?, tel = ?, level = ?';
    const updateArgs = [name.trim(), surname.trim(), tel.trim(), levelNum];

    if (password?.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ 
          success: false, 
          error: 'Password troppo corta (minimo 6 caratteri)' 
        });
      }
      const salt = tel.trim();
      const passwordHash = hashPassword(password, salt);
      updateSql += ', password_hash = ?, salt = ?';
      updateArgs.push(passwordHash, salt);
    }

    updateSql += ' WHERE id = ? RETURNING *';
    updateArgs.push(id);

    const result = await client.execute({
      sql: updateSql,
      args: updateArgs
    });

    return res.status(200).json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento utente:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Handler per eliminare un utente (DELETE)
async function deleteUser(req, res) {
  try {
    const id = req.query.id || req.body.id;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID utente mancante' 
      });
    }

    const result = await client.execute({
      sql: 'DELETE FROM users WHERE id = ? RETURNING id, name, surname',
      args: [id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Utente non trovato' 
      });
    }

    return res.status(200).json({
      success: true,
      deletedUser: result.rows[0],
      message: 'Utente eliminato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione utente:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Export handler principale (come nel file orari)
export default async function handler(req, res) {
  console.log(`API /user chiamata con metodo: ${req.method}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test connessione DB con più dettagli
    console.log('Testing database connection...');
    const testResult = await client.execute("SELECT 1 as test");
    console.log('Database connection successful:', testResult);
    
    switch (req.method) {
      case 'GET':
        console.log('Handling GET request...');
        return await getUsers(req, res);
      case 'POST':
        console.log('Handling POST request...');
        return await createUser(req, res);
      case 'PUT':
        console.log('Handling PUT request...');
        return await updateUser(req, res);
      case 'DELETE':
        console.log('Handling DELETE request...');
        return await deleteUser(req, res);
      default:
        console.log(`Metodo non supportato: ${req.method}`);
        return res.status(405).json({ 
          success: false, 
          error: 'Metodo non supportato' 
        });
    }
  } catch (error) {
    console.error('Errore API dettagliato:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    return res.status(500).json({ 
      success: false,
      error: 'Errore interno del server',
      details: error.message,
      debugInfo: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name,
        code: error.code
      } : undefined
    });
  }
}