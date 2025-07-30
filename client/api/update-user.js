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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test connessione DB
    await client.execute("SELECT 1");
    
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