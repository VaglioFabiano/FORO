import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pool from './db.js';

// Per risolvere il path relativo in ES module:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initDb = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'sql', 'create-tables.sql'), 'utf8');
    await pool.query(sql);
    console.log('Tabelle create!');
  } catch (err) {
    console.error('Errore nella creazione delle tabelle:', err);
  } finally {
    process.exit(0);
  }
};

initDb();
