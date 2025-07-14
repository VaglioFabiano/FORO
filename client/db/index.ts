// client/db/index.ts
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Tipo per l'entità User
export interface User {
  id: number;
  name: string;
  surname: string;
  tel: string;
  level: number;
}

// Funzione per ottenere tutti gli utenti
export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await db.execute('SELECT * FROM users');
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      surname: row.surname,
      tel: row.tel,
      level: row.level,
    })) as User[];
  } catch (error) {
    console.error('Errore nel recupero degli utenti:', error);
    throw error;
  }
}