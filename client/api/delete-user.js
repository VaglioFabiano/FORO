import { createClient } from '@libsql/client/web';

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
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test connessione DB
    await client.execute("SELECT 1");
    
    const { id } = req.body;
    const tempToken = req.headers.authorization?.replace('Bearer ', '');

    if (!tempToken) {
      return res.status(401).json({ error: 'Token di autenticazione richiesto' });
    }

    const currentUser = await verifyUser(tempToken);
    if (!currentUser) {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }

    // Solo admin (livello 0) può eliminare utenti
    if (currentUser.level !== 0) {
      return res.status(403).json({ error: 'Solo gli amministratori possono eliminare utenti' });
    }

    // Validazione input
    if (!id) {
      return res.status(400).json({ error: 'ID utente richiesto' });
    }

    // Verifica che l'utente da eliminare esista
    const targetUserResult = await client.execute({
      sql: 'SELECT id, name, surname, level, tel FROM users WHERE id = ?',
      args: [id]
    });

    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const targetUser = targetUserResult.rows[0];

    // Impedisce l'auto-eliminazione
    if (parseInt(id) === currentUser.id) {
      return res.status(400).json({ error: 'Non puoi eliminare il tuo stesso account' });
    }

    // Verifica se è l'ultimo admin nel sistema
    if (targetUser.level === 0) {
      const adminCountResult = await client.execute({
        sql: 'SELECT COUNT(*) as count FROM users WHERE level = 0'
      });
      
      const adminCount = adminCountResult.rows[0].count;
      
      if (adminCount <= 1) {
        return res.status(400).json({ 
          error: 'Non puoi eliminare l\'ultimo amministratore del sistema' 
        });
      }
    }

    // Salva i dati dell'utente prima dell'eliminazione per il log
    const userToDelete = {
      id: targetUser.id,
      name: targetUser.name,
      surname: targetUser.surname,
      level: targetUser.level,
      tel: targetUser.tel
    };

    // Esegui l'eliminazione
    const deleteResult = await client.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id]
    });

    if (deleteResult.rowsAffected === 0) {
      return res.status(404).json({ error: 'Utente non trovato o già eliminato' });
    }

    // Log dell'operazione per audit
    console.log(`User deleted: ID ${userToDelete.id} (${userToDelete.name} ${userToDelete.surname}) by admin ${currentUser.id} (${currentUser.name})`);

    return res.status(200).json({
      success: true,
      message: `Utente ${userToDelete.name} ${userToDelete.surname} eliminato con successo`,
      deletedUser: {
        id: userToDelete.id,
        name: userToDelete.name,
        surname: userToDelete.surname,
        level: userToDelete.level
      },
      deletedBy: {
        id: currentUser.id,
        name: currentUser.name,
        level: currentUser.level
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    
    // Gestione errori specifici del database
    if (error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({ 
        error: 'Impossibile eliminare l\'utente: esistono dati collegati' 
      });
    }

    return res.status(500).json({
      error: 'Errore interno del server',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}