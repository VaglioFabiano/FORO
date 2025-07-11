// lib/db.ts
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
});

// Funzione per inizializzare il database con la tabella users
export async function initializeDatabase() {
  try {
    // Crea la tabella users con i campi richiesti
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cognome TEXT NOT NULL,
        livello INTEGER NOT NULL,
        telefono TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database table "users" created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating users table:', error);
    return false;
  }
}

// Funzione per ottenere tutte le tabelle
export async function getTables() {
  try {
    const result = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    return result.rows;
  } catch (error) {
    console.error('Error getting tables:', error);
    return [];
  }
}

// Funzione per ottenere la struttura di una tabella
export async function getTableStructure(tableName: string) {
  try {
    const result = await db.execute(`PRAGMA table_info(${tableName})`);
    return result.rows;
  } catch (error) {
    console.error(`Error getting structure for table ${tableName}:`, error);
    return [];
  }
}

// Funzione per inserire dati di esempio
export async function insertSampleData() {
  try {
    // Inserisci alcuni utenti di esempio
    await db.execute({
      sql: 'INSERT OR IGNORE INTO users (nome, cognome, livello, telefono) VALUES (?, ?, ?, ?)',
      args: ['Fabiano', 'Vaglio', 0, '00393450881086']
    });


    console.log('✅ Sample users inserted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error inserting sample users:', error);
    return false;
  }
}

// Funzioni per gestire gli utenti
export async function getAllUsers() {
  try {
    const result = await db.execute('SELECT * FROM users ORDER BY id');
    return result.rows;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

export async function createUser(nome: string, cognome: string, livello: string, telefono: string) {
  try {
    const result = await db.execute({
      sql: 'INSERT INTO users (nome, cognome, livello, telefono) VALUES (?, ?, ?, ?) RETURNING *',
      args: [nome, cognome, livello, telefono]
    });
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function updateUser(id: number, nome: string, cognome: string, livello: string, telefono: string) {
  try {
    const result = await db.execute({
      sql: 'UPDATE users SET nome = ?, cognome = ?, livello = ?, telefono = ? WHERE id = ? RETURNING *',
      args: [nome, cognome, livello, telefono, id]
    });
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

export async function deleteUser(id: number) {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id]
    });
    return result.rowsAffected > 0;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}