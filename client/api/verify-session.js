import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

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
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Token di sessione richiesto' });
    }

    // Verifica la sessione
    const sessionResult = await client.execute({
      sql: `SELECT s.id, s.user_id, s.expires_at, 
                   u.name, u.surname, u.tel, u.level
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP`,
      args: [sessionToken]
    });

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Sessione non valida o scaduta' });
    }

    const session = sessionResult.rows[0];

    return res.status(200).json({ 
      success: true, 
      user: {
        id: session.user_id,
        name: session.name,
        surname: session.surname,
        tel: session.tel,
        level: session.level
      }
    });

  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({ 
      error: 'Errore durante la verifica della sessione',
      details: error.message
    });
  }
}