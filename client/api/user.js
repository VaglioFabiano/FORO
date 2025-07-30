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

// Funzione per verificare l'utente basata sui dati del token temporaneo
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
    if (isNaN(levelNum) || levelNum < 0 || levelNum > 4) {
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
    console.error('Error creating user:', error);
    return res.status(500).json({
      error: 'Errore interno',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
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

    // Solo admin (livello 0) e direttivo (livello 1) possono vedere tutti gli utenti
    if (user.level > 1) {
      return res.status(403).json({ error: 'Permessi insufficienti per visualizzare gli utenti' });
    }

    // Query per ottenere tutti gli utenti (escluso password_hash e salt per sicurezza)
    const result = await client.execute({
      sql: `SELECT 
              id, 
              name, 
              surname, 
              tel, 
              level, 
              created_at, 
              last_login,
              telegram_chat_id
            FROM users 
            ORDER BY level ASC, created_at DESC`
    });

    // Formatta i dati per una migliore gestione nel frontend
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

    return res.status(200).json({
      success: true,
      users: users,
      total: users.length,
      requestedBy: {
        id: user.id,
        name: user.name,
        level: user.level
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      error: 'Errore interno del server',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
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

    // Solo admin (livello 0) e direttivo (livello 1) possono modificare utenti
    if (currentUser.level > 1) {
      return res.status(403).json({ error: 'Permessi insufficienti per modificare utenti' });
    }

    // Validazione input
    if (!id || !name?.trim() || !surname?.trim() || !tel?.trim()) {
      return res.status(400).json({ error: 'ID, nome, cognome e telefono sono obbligatori' });
    }

    const levelNum = parseInt(level);
    if (isNaN(levelNum) || levelNum < 0 || levelNum > 4) {
      return res.status(400).json({ error: 'Livello non valido (0-4)' });
    }

    // Verifica che l'utente da modificare esista
    const targetUserResult = await client.execute({
      sql: 'SELECT id, level, tel FROM users WHERE id = ?',
      args: [id]
    });

    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const targetUser = targetUserResult.rows[0];

    // Controlli di sicurezza sui permessi
    // Solo admin può modificare admin e direttivo
    if (currentUser.level > 0 && (targetUser.level < currentUser.level || levelNum < currentUser.level)) {
      return res.status(403).json({ error: 'Non puoi modificare utenti con livello superiore o assegnare livelli superiori al tuo' });
    }

    // Verifica che il telefono non sia già in uso da un altro utente
    if (tel.trim() !== targetUser.tel) {
      const telCheckResult = await client.execute({
        sql: 'SELECT id FROM users WHERE tel = ? AND id != ?',
        args: [tel.trim(), id]
      });

      if (telCheckResult.rows.length > 0) {
        return res.status(400).json({ error: 'Telefono già registrato da un altro utente' });
      }
    }

    // Prepara la query di aggiornamento
    let updateSql = `UPDATE users SET name = ?, surname = ?, tel = ?, level = ?`;
    let updateArgs = [name.trim(), surname.trim(), tel.trim(), levelNum];

    // Se è stata fornita una nuova password, aggiornala
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password troppo corta (minimo 6 caratteri)' });
      }

      const salt = tel.trim(); // Usa il telefono come salt
      const passwordHash = hashPassword(password, salt);
      
      updateSql += `, password_hash = ?, salt = ?`;
      updateArgs.push(passwordHash, salt);
    }

    updateSql += ` WHERE id = ?`;
    updateArgs.push(id);

    // Esegui l'aggiornamento
    const updateResult = await client.execute({
      sql: updateSql,
      args: updateArgs
    });

    if (updateResult.rowsAffected === 0) {
      return res.status(404).json({ error: 'Utente non trovato o nessuna modifica apportata' });
    }

    // Recupera i dati aggiornati dell'utente
    const updatedUserResult = await client.execute({
      sql: `SELECT id, name, surname, tel, level, created_at, last_login, telegram_chat_id 
            FROM users WHERE id = ?`,
      args: [id]
    });

    const updatedUser = updatedUserResult.rows[0];

    // Log dell'operazione per audit
    console.log(`User updated: ID ${id} by user ${currentUser.id} (${currentUser.name})`);

    return res.status(200).json({
      success: true,
      message: 'Utente aggiornato con successo',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        surname: updatedUser.surname,
        tel: updatedUser.tel,
        level: updatedUser.level,
        created_at: updatedUser.created_at,
        last_login: updatedUser.last_login,
        telegram_chat_id: updatedUser.telegram_chat_id
      },
      updatedBy: {
        id: currentUser.id,
        name: currentUser.name,
        level: currentUser.level
      },
      passwordChanged: password && password.trim() ? true : false
    });

  } catch (error) {
    console.error('Error updating user:', error);
    
    // Gestione errori specifici del database
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Telefono già registrato' });
    }

    return res.status(500).json({
      error: 'Errore interno del server',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}

// Handler per eliminare un utente (DELETE)
async function deleteUser(req, res) {
  try {
    const { id } = req.query; // Prende l'ID dalla query string per DELETE
    const tempToken = req.headers.authorization?.replace('Bearer ', '');

    if (!tempToken) {
      return res.status(401).json({ error: 'Token di autenticazione richiesto' });
    }

    const currentUser = await verifyUser(tempToken);
    if (!currentUser) {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }

    // Solo admin (livello 0) può eliminare utenti
    if (currentUser.level > 0) {
      return res.status(403).json({ error: 'Solo gli amministratori possono eliminare utenti' });
    }

    if (!id) {
      return res.status(400).json({ error: 'ID utente richiesto' });
    }

    // Verifica che l'utente da eliminare esista
    const targetUserResult = await client.execute({
      sql: 'SELECT id, name, surname, level FROM users WHERE id = ?',
      args: [id]
    });

    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const targetUser = targetUserResult.rows[0];

    // Non permettere l'eliminazione di se stesso
    if (parseInt(id) === currentUser.id) {
      return res.status(400).json({ error: 'Non puoi eliminare il tuo stesso account' });
    }

    // Elimina l'utente
    const deleteResult = await client.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id]
    });

    if (deleteResult.rowsAffected === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Log dell'operazione per audit
    console.log(`User deleted: ID ${id} (${targetUser.name} ${targetUser.surname}) by user ${currentUser.id} (${currentUser.name})`);

    return res.status(200).json({
      success: true,
      message: 'Utente eliminato con successo',
      deletedUser: {
        id: targetUser.id,
        name: targetUser.name,
        surname: targetUser.surname,
        level: targetUser.level
      },
      deletedBy: {
        id: currentUser.id,
        name: currentUser.name,
        level: currentUser.level
      }
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      error: 'Errore interno del server',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}

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
    
    // Router basato sul metodo HTTP
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
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({
      error: 'Errore di connessione al database',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}