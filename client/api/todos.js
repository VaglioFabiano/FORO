import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        // Ottieni tutti i todos
        const todos = await client.execute('SELECT * FROM todos ORDER BY created_at DESC');
        return res.status(200).json({ success: true, data: todos.rows });

      case 'POST':
        // Crea nuovo todo
        const { description } = req.body;
        if (!description) {
          return res.status(400).json({ error: 'Description is required' });
        }
        
        const newTodo = await client.execute({
          sql: 'INSERT INTO todos (description) VALUES (?) RETURNING *',
          args: [description]
        });
        
        return res.status(201).json({ success: true, data: newTodo.rows[0] });

      case 'PUT':
        // Aggiorna todo
        const { id, completed } = req.body;
        if (!id) {
          return res.status(400).json({ error: 'ID is required' });
        }
        
        const updatedTodo = await client.execute({
          sql: 'UPDATE todos SET completed = ? WHERE id = ? RETURNING *',
          args: [completed, id]
        });
        
        return res.status(200).json({ success: true, data: updatedTodo.rows[0] });

      case 'DELETE':
        // Elimina todo
        const { id: deleteId } = req.body;
        if (!deleteId) {
          return res.status(400).json({ error: 'ID is required' });
        }
        
        await client.execute({
          sql: 'DELETE FROM todos WHERE id = ?',
          args: [deleteId]
        });
        
        return res.status(200).json({ success: true, message: 'Todo deleted' });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed',
      details: error.message
    });
  }
}