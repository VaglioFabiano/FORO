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
    console.log('Verifying token...');
    const decoded = JSON.parse(atob(tempToken));
    console.log('Decoded token:', decoded);

    const { userId, tel, timestamp } = decoded;
    
    // Verifica che l'ID sia valido
    if (!userId || userId <= 0) {
      console.error('ID utente non valido:', userId);
      return null;
    }
    
    // Resto del codice...
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export default async function handler(req, res) {
  console.log('GET /api/get-user called'); // Debug log
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('Testing DB connection...'); // Debug log
    
    // Test connessione DB
    await client.execute("SELECT 1");
    
    console.log('DB connection OK'); // Debug log
    
    const authHeader = req.headers.authorization;
    const tempToken = authHeader?.replace('Bearer ', '');

    console.log('Auth header present:', !!authHeader); // Debug log
    console.log('Token extracted:', !!tempToken); // Debug log

    if (!tempToken) {
      return res.status(401).json({ 
        success: false,
        error: 'Token di autenticazione richiesto' 
      });
    }

    console.log('Verifying user...'); // Debug log
    const user = await verifyUser(tempToken);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Token non valido o scaduto' 
      });
    }

    console.log('User verified, level:', user.level); // Debug log

    // Verifica che l'utente abbia il livello appropriato (livello 1 o superiore)
    if (user.level > 1) {
      return res.status(403).json({ 
        success: false,
        error: 'Permessi insufficienti per visualizzare gli utenti' 
      });
    }

    console.log('Fetching all users...'); // Debug log

    // Recupera tutti gli utenti con le informazioni necessarie
    // Usa datetime() per convertire il timestamp in formato leggibile
    const result = await client.execute({
      sql: `SELECT 
              id, 
              name, 
              surname, 
              tel, 
              level, 
              datetime(created_at) as created_at
            FROM users 
            ORDER BY created_at DESC`
    });

    console.log('Users fetched:', result.rows.length); // Debug log
    console.log('First row sample:', result.rows[0]); // Debug per vedere il formato

    // Formatta i risultati - gestisce sia oggetti che array
    const users = result.rows.map((row, index) => {
      try {
        // Gestisce il caso in cui row possa essere un array o un oggetto
        let userData;
        if (Array.isArray(row)) {
          userData = {
            id: row[0],
            name: row[1],
            surname: row[2],
            tel: row[3],
            level: row[4],
            created_at: row[5]
          };
        } else {
          userData = {
            id: row.id,
            name: row.name,
            surname: row.surname,
            tel: row.tel,
            level: row.level,
            created_at: row.created_at
          };
        }
        
        // Assicurati che tutti i campi siano definiti
        return {
          id: userData.id || 0,
          name: userData.name || '',
          surname: userData.surname || '',
          tel: userData.tel || '',
          level: userData.level || 0,
          created_at: userData.created_at || new Date().toISOString()
        };
      } catch (error) {
        console.error(`Error processing row ${index}:`, error, row);
        return null;
      }
    }).filter(user => user !== null); // Rimuovi eventuali utenti null

    console.log('Returning users:', users.length); // Debug log

    return res.status(200).json({
      success: true,
      users: users,
      total: users.length
    });

  } catch (error) {
    console.error('Error fetching users - Full error:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        stack: error.stack 
      })
    });
  }
}