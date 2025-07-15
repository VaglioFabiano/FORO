import { createClient } from '@libsql/client';
import { VercelRequest, VercelResponse } from '@vercel/node';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Crea la tabella
    const result = await client.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    return res.status(200).json({ 
      success: true, 
      message: 'Database setup completed',
      result 
    });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}