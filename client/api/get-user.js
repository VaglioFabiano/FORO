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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test connessione DB
    await client.execute("SELECT 1");
    
    const tempToken = req.headers.authorization?.replace('Bearer ', '');

    if (!tempToken) {
      return res.status(401).json({ error: 'Token di autenticazione richiesto' });
    }

    const user = await verifyUser(tempToken);
    if (!user) {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }

    // Verifica che l'utente abbia il livello appropriato (livello 1 o superiore)
    if (user.level > 1) {
      return res.status(403).json({ error: 'Permessi insufficienti per visualizzare gli utenti' });
    }

    // Recupera tutti gli utenti con le informazioni necessarie
    const result = await client.execute({
      sql: `SELECT 
              id, 
              name, 
              surname, 
              tel, 
              level, 
              created_at
            FROM users 
            ORDER BY created_at DESC`
    });

    // Formatta i risultati
    const users = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      surname: row.surname,
      tel: row.tel,
      level: row.level,
      created_at: row.created_at
    }));

    return res.status(200).json({
      success: true,
      users: users,
      total: users.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}