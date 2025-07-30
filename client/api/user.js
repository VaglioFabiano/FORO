import { createClient } from '@libsql/client/web';
import crypto from 'crypto';

// Configurazione con validazione (uguale al file orari)
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
  try {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  } catch (error) {
    console.error('Errore durante l\'hashing della password:', error);
    throw new Error('Errore nella generazione della password');
  }
}

// Funzione per verificare l'utente
async function verifyUser(tempToken) {
  try {
    // Usa atob invece di Buffer per la compatibilità con Edge Runtime
    const decoded = JSON.parse(atob(tempToken));
    const { userId, tel, timestamp } = decoded;
    
    console.log('Token decodificato:', { userId, tel, timestamp }); // Debug
    
    if (!userId || !tel || !timestamp) {
      console.warn('Token malformato - dati mancanti:', { userId: !!userId, tel: !!tel, timestamp: !!timestamp });
      return null;
    }

    const now = Date.now();
    const tokenAge = now - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 ore invece di 1 ora per test
    
    console.log('Verifica scadenza:', { now, timestamp: parseInt(timestamp), tokenAge, maxAge }); // Debug
    
    if (tokenAge > maxAge) {
      console.warn('Token scaduto - età:', tokenAge, 'max:', maxAge);
      return null;
    }
    
    const result = await client.execute({
      sql: 'SELECT id, level, name, surname, tel FROM users WHERE id = ? AND tel = ?',
      args: [userId, tel]
    });
    
    console.log('Risultato query utente:', result.rows.length); // Debug
    
    if (result.rows.length === 0) {
      console.warn('Utente non trovato nel DB per id:', userId, 'tel:', tel);
      return null;
    }

    const user = result.rows[0];
    console.log('Utente trovato:', { id: user.id, level: user.level, name: user.name }); // Debug
    return user;
  } catch (error) {
    console.error('Errore nella verifica utente:', error);
    return null;
  }
}

// Handler per creare un nuovo utente (POST)
async function createUser(req, res) {
  try {
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
    if (isNaN(levelNum)) {
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
      error: 'Errore interno del server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Handler per ottenere tutti gli utenti (GET)
async function getUsers(req, res) {
  try {
    const tempToken = req.headers.authorization?.replace('Bearer ', '');

    if (!tempToken) {
      return res.status(401).json({ error: 'Token di autenticazione richiesto' });
    }

    const user = await verifyUser(tempToken);
    if (!user) {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }

    if (user.level > 1) {
      return res.status(403).json({ error: 'Permessi insufficienti' });
    }

    const result = await client.execute({
      sql: `SELECT 
              id, name, surname, tel, level, 
              created_at, last_login, telegram_chat_id
            FROM users 
            ORDER BY level ASC, created_at DESC`
    });

    return res.status(200).json({
      success: true,
      users: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Errore nel recupero utenti:', error);
    return res.status(500).json({
      error: 'Errore interno del server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Handler per aggiornare un utente (PUT)
async function updateUser(req, res) {
  try {
    const { id, name, surname, tel, level, password } = req.body;
    const tempToken = req.headers.authorization?.replace('Bearer ', '');

    if (!tempToken) {
      return res.status(401).json({ error: 'Token di autenticazione richiesto' });
    }

    const currentUser = await verifyUser(tempToken);
    if (!currentUser) {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }

    if (currentUser.level > 1) {
      return res.status(403).json({ error: 'Permessi insufficienti' });
    }

    if (!id || !name?.trim() || !surname?.trim() || !tel?.trim()) {
      return res.status(400).json({ error: 'Dati mancanti' });
    }

    const levelNum = parseInt(level);
    if (isNaN(levelNum)) {
      return res.status(400).json({ error: 'Livello non valido' });
    }

    // Verifica esistenza utente
    const targetUser = await client.execute({
      sql: 'SELECT id, level, tel FROM users WHERE id = ?',
      args: [id]
    });

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Controlli permessi
    if (currentUser.level > 0 && 
        (targetUser.rows[0].level < currentUser.level || levelNum < currentUser.level)) {
      return res.status(403).json({ error: 'Permessi insufficienti' });
    }

    // Verifica telefono univoco
    if (tel.trim() !== targetUser.rows[0].tel) {
      const telCheck = await client.execute({
        sql: 'SELECT id FROM users WHERE tel = ? AND id != ?',
        args: [tel.trim(), id]
      });

      if (telCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Telefono già registrato' });
      }
    }

    // Costruzione query dinamica
    let updateSql = 'UPDATE users SET name = ?, surname = ?, tel = ?, level = ?';
    const updateArgs = [name.trim(), surname.trim(), tel.trim(), levelNum];

    if (password?.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password troppo corta' });
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
      error: 'Errore interno del server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Handler per eliminare un utente (DELETE)
async function deleteUser(req, res) {
  try {
    const id = req.query.id || req.body.id;
    const tempToken = req.headers.authorization?.replace('Bearer ', '');

    if (!tempToken) {
      return res.status(401).json({ error: 'Token di autenticazione richiesto' });
    }

    const currentUser = await verifyUser(tempToken);
    if (!currentUser) {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }

    if (currentUser.level > 0) {
      return res.status(403).json({ error: 'Permessi insufficienti' });
    }

    if (!id) {
      return res.status(400).json({ error: 'ID utente mancante' });
    }

    if (parseInt(id) === currentUser.id) {
      return res.status(400).json({ error: 'Non puoi eliminare il tuo account' });
    }

    const result = await client.execute({
      sql: 'DELETE FROM users WHERE id = ? RETURNING id, name, surname',
      args: [id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    return res.status(200).json({
      success: true,
      deletedUser: result.rows[0]
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione utente:', error);
    return res.status(500).json({
      error: 'Errore interno del server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Export handler principale (come nel file orari)
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test connessione DB
    await client.execute("SELECT 1");
    
    switch (req.method) {
      case 'GET':
        return await getUsers(req, res);
      case 'POST':
        return await createUser(req, res);
      case 'PUT':
        return await updateUser(req, res);
      case 'DELETE':
        return await deleteUser(req, res);
      default:
        return res.status(405).json({ error: 'Metodo non supportato' });
    }
  } catch (error) {
    console.error('Errore API:', error);
    
    return res.status(500).json({ 
      error: 'Errore interno del server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}