// scripts/init-db.ts
import { initializeDatabase, insertSampleData, getTables, getTableStructure } from '../lib/db.js';

async function main() {
  console.log('🚀 Initializing database...');
  
  // Inizializza le tabelle
  const tablesCreated = await initializeDatabase();
  if (!tablesCreated) {
    console.log('❌ Failed to create tables');
    process.exit(1);
  }

  // Inserisci dati di esempio
  console.log('📝 Inserting sample data...');
  await insertSampleData();

  // Mostra tutte le tabelle
  console.log('\n📊 Database Tables:');
  const tables = await getTables();
  console.table(tables);

  // Mostra la struttura di ogni tabella
  for (const table of tables) {
    const tableName = table.name as string;
    console.log(`\n🏗️  Structure of table "${tableName}":`);
    const structure = await getTableStructure(tableName);
    console.table(structure);
  }

  console.log('\n✅ Database initialization complete!');
  process.exit(0);
}

main().catch(console.error);