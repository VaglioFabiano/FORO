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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test connessione DB
    await client.execute("SELECT 1");

    // Determina la tabella in base al parametro settimana
    const settimana = req.body?.settimana || req.query?.settimana || 'current';
    const tableName = settimana === 'next' ? 'fasce_orarie_prossima' : 'fasce_orarie';

    switch (req.method) {
      case 'GET':
        // Ottieni tutti gli orari della settimana ordinati per giorno
        const orari = await client.execute(`
          SELECT 
            id,
            giorno,
            ora_inizio,
            ora_fine,
            note
          FROM ${tableName}
          ORDER BY 
            CASE giorno 
              WHEN 'lunedì' THEN 1
              WHEN 'martedì' THEN 2
              WHEN 'mercoledì' THEN 3
              WHEN 'giovedì' THEN 4
              WHEN 'venerdì' THEN 5
              WHEN 'sabato' THEN 6
              WHEN 'domenica' THEN 7
            END,
            ora_inizio
        `);
        
        return res.status(200).json({ 
          success: true, 
          data: orari.rows 
        });

      case 'POST':
        // Aggiungi nuova fascia oraria
        const { giorno, ora_inizio, ora_fine, note } = req.body;
        
        if (!giorno || !ora_inizio || !ora_fine) {
          return res.status(400).json({ 
            error: 'Giorno, ora_inizio e ora_fine sono richiesti' 
          });
        }
        
        // Verifica che il giorno sia valido
        const validDays = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
        if (!validDays.includes(giorno.toLowerCase())) {
          return res.status(400).json({ 
            error: 'Giorno non valido' 
          });
        }
        
        const newOrario = await client.execute({
          sql: `INSERT INTO ${tableName} (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?) RETURNING *`,
          args: [giorno.toLowerCase(), ora_inizio, ora_fine, note || null]
        });
        
        return res.status(201).json({ 
          success: true, 
          data: newOrario.rows[0] 
        });

      case 'PUT':
        // Aggiorna fascia oraria esistente
        const { id, giorno: updateGiorno, ora_inizio: updateInizio, ora_fine: updateFine, note: updateNote } = req.body;
        
        if (!id) {
          return res.status(400).json({ 
            error: 'ID è richiesto' 
          });
        }
        
        // Costruisci la query dinamicamente solo per i campi forniti
        let updateFields = [];
        let updateArgs = [];
        
        if (updateGiorno) {
          updateFields.push('giorno = ?');
          updateArgs.push(updateGiorno.toLowerCase());
        }
        if (updateInizio) {
          updateFields.push('ora_inizio = ?');
          updateArgs.push(updateInizio);
        }
        if (updateFine) {
          updateFields.push('ora_fine = ?');
          updateArgs.push(updateFine);
        }
        if (updateNote !== undefined) {
          updateFields.push('note = ?');
          updateArgs.push(updateNote);
        }
        
        if (updateFields.length === 0) {
          return res.status(400).json({ 
            error: 'Almeno un campo da aggiornare è richiesto' 
          });
        }
        
        updateArgs.push(id);
        
        const updatedOrario = await client.execute({
          sql: `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = ? RETURNING *`,
          args: updateArgs
        });
        
        if (updatedOrario.rows.length === 0) {
          return res.status(404).json({ 
            error: 'Fascia oraria non trovata' 
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          data: updatedOrario.rows[0] 
        });

      case 'DELETE':
        // Elimina fascia oraria
        const { id: deleteId } = req.body;
        
        console.log(`DELETE request body:`, req.body);
        console.log(`DELETE ID type: ${typeof deleteId}, value: ${deleteId}`);
        console.log(`DELETE table: ${tableName}`);
        
        if (!deleteId) {
          return res.status(400).json({ 
            error: 'ID è richiesto' 
          });
        }

        // Converti l'ID in numero per sicurezza
        const numericId = parseInt(deleteId, 10);
        if (isNaN(numericId)) {
          return res.status(400).json({ 
            error: 'ID deve essere un numero valido' 
          });
        }

        console.log(`Attempting to delete from table: ${tableName}, ID: ${numericId}`);
        
        // Prima verifichiamo se l'elemento esiste
        const existingItem = await client.execute({
          sql: `SELECT id FROM ${tableName} WHERE id = ?`,
          args: [numericId]
        });
        
        console.log(`Existing item check:`, existingItem);
        
        if (existingItem.rows.length === 0) {
          return res.status(404).json({ 
            error: 'Fascia oraria non trovata' 
          });
        }
        
        const deleteResult = await client.execute({
          sql: `DELETE FROM ${tableName} WHERE id = ?`,
          args: [numericId]
        });
        
        console.log(`Delete result:`, deleteResult);
        
        return res.status(200).json({ 
          success: true, 
          message: 'Fascia oraria eliminata',
          deletedId: numericId
        });

      default:
        return res.status(405).json({ 
          error: 'Metodo non consentito' 
        });
    }
  } catch (error) {
    console.error('Database error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      method: req.method,
      body: req.body,
      query: req.query
    });
    return res.status(500).json({ 
      error: 'Operazione sul database fallita',
      details: error.message, // Mostra sempre l'errore per debugging
      stack: error.stack,
      method: req.method,
      tableName: settimana === 'next' ? 'fasce_orarie_prossima' : 'fasce_orarie'
    });
  }
}