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

// Funzione helper per ottenere il nome della tabella sicuro
function getTableName(settimana) {
  return settimana === 'next' ? 'fasce_orarie_prossima' : 'fasce_orarie';
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Wrap everything in try-catch per catturare anche errori di parsing
  try {
    console.log(`API Request: ${req.method}`, {
      body: req.body,
      query: req.query
    });

    // Test connessione DB
    try {
      await client.execute("SELECT 1");
      console.log("DB connection successful");
    } catch (dbError) {
      console.error("DB connection failed:", dbError);
      return res.status(500).json({
        error: 'Connessione al database fallita',
        details: dbError.message
      });
    }

    // Determina la tabella in base al parametro settimana
    const settimana = req.body?.settimana || req.query?.settimana || 'current';
    const tableName = getTableName(settimana);
    
    console.log(`Using table: ${tableName} (settimana: ${settimana})`);

    switch (req.method) {
      case 'GET':
        try {
          console.log(`Executing GET query on ${tableName}`);
          
          let query;
          if (tableName === 'fasce_orarie_prossima') {
            query = `
              SELECT 
                id,
                giorno,
                ora_inizio,
                ora_fine,
                note
              FROM fasce_orarie_prossima
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
            `;
          } else {
            query = `
              SELECT 
                id,
                giorno,
                ora_inizio,
                ora_fine,
                note
              FROM fasce_orarie
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
            `;
          }
          
          const orari = await client.execute(query);
          console.log(`GET result: ${orari.rows.length} rows`);
          
          return res.status(200).json({ 
            success: true, 
            data: orari.rows 
          });
        } catch (error) {
          console.error('GET error:', error);
          return res.status(500).json({
            error: 'Errore nel recupero degli orari',
            details: error.message
          });
        }

      case 'POST':
        try {
          const { giorno, ora_inizio, ora_fine, note } = req.body;
          
          console.log('POST data:', { giorno, ora_inizio, ora_fine, note });
          
          if (!giorno || !ora_inizio || !ora_fine) {
            return res.status(400).json({ 
              error: 'Giorno, ora_inizio e ora_fine sono richiesti' 
            });
          }
          
          const validDays = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
          if (!validDays.includes(giorno.toLowerCase())) {
            return res.status(400).json({ 
              error: 'Giorno non valido' 
            });
          }
          
          let insertQuery;
          if (tableName === 'fasce_orarie_prossima') {
            insertQuery = 'INSERT INTO fasce_orarie_prossima (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?) RETURNING *';
          } else {
            insertQuery = 'INSERT INTO fasce_orarie (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?) RETURNING *';
          }
          
          const newOrario = await client.execute({
            sql: insertQuery,
            args: [giorno.toLowerCase(), ora_inizio, ora_fine, note || null]
          });
          
          console.log('POST result:', newOrario.rows[0]);
          
          return res.status(201).json({ 
            success: true, 
            data: newOrario.rows[0] 
          });
        } catch (error) {
          console.error('POST error:', error);
          return res.status(500).json({
            error: 'Errore nella creazione dell\'orario',
            details: error.message
          });
        }

      case 'PUT':
        try {
          const { id, giorno: updateGiorno, ora_inizio: updateInizio, ora_fine: updateFine, note: updateNote } = req.body;
          
          console.log('PUT data:', { id, updateGiorno, updateInizio, updateFine, updateNote });
          
          if (!id) {
            return res.status(400).json({ 
              error: 'ID è richiesto' 
            });
          }
          
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
          
          updateArgs.push(parseInt(id, 10));
          
          let updateQuery;
          if (tableName === 'fasce_orarie_prossima') {
            updateQuery = `UPDATE fasce_orarie_prossima SET ${updateFields.join(', ')} WHERE id = ? RETURNING *`;
          } else {
            updateQuery = `UPDATE fasce_orarie SET ${updateFields.join(', ')} WHERE id = ? RETURNING *`;
          }
          
          const updatedOrario = await client.execute({
            sql: updateQuery,
            args: updateArgs
          });
          
          if (updatedOrario.rows.length === 0) {
            return res.status(404).json({ 
              error: 'Fascia oraria non trovata' 
            });
          }
          
          console.log('PUT result:', updatedOrario.rows[0]);
          
          return res.status(200).json({ 
            success: true, 
            data: updatedOrario.rows[0] 
          });
        } catch (error) {
          console.error('PUT error:', error);
          return res.status(500).json({
            error: 'Errore nell\'aggiornamento dell\'orario',
            details: error.message
          });
        }

     case 'DELETE':
      try {
        const { id: deleteId } = req.body;
        
        console.log(`DELETE request - ID: ${deleteId}, table: ${tableName}`);
        
        if (!deleteId) {
          return res.status(400).json({ 
            error: 'ID è richiesto' 
          });
        }

        const numericId = parseInt(deleteId, 10);
        if (isNaN(numericId)) {
          return res.status(400).json({ 
            error: 'ID deve essere un numero valido' 
          });
        }

        console.log(`Attempting to delete ID ${numericId} from ${tableName}`);
        
        // Prima verifichiamo se l'elemento esiste
        let selectQuery;
        if (tableName === 'fasce_orarie_prossima') {
          selectQuery = 'SELECT id, giorno FROM fasce_orarie_prossima WHERE id = ?';
        } else {
          selectQuery = 'SELECT id, giorno FROM fasce_orarie WHERE id = ?';
        }
        
        const existingItem = await client.execute({
          sql: selectQuery,
          args: [numericId]
        });
        
        console.log(`Existing item check result: ${existingItem.rows.length} rows found`);
        
        if (existingItem.rows.length === 0) {
          return res.status(404).json({ 
            error: 'Fascia oraria non trovata' 
          });
        }

        console.log('Item found:', existingItem.rows[0]);
        
        // Disabilita temporaneamente le foreign key constraints
        await client.execute("PRAGMA foreign_keys = OFF");
        
        try {
          // Procediamo con l'eliminazione
          let deleteQuery;
          if (tableName === 'fasce_orarie_prossima') {
            deleteQuery = 'DELETE FROM fasce_orarie_prossima WHERE id = ?';
          } else {
            deleteQuery = 'DELETE FROM fasce_orarie WHERE id = ?';
          }
          
          const deleteResult = await client.execute({
            sql: deleteQuery,
            args: [numericId]
          });
          
          console.log(`Delete result:`, deleteResult);
          
          // Riabilita le foreign key constraints
          await client.execute("PRAGMA foreign_keys = ON");
          
          return res.status(200).json({ 
            success: true, 
            message: 'Fascia oraria eliminata',
            deletedId: numericId
          });
          
        } catch (deleteError) {
          console.error('Delete operation failed:', deleteError);
          // Riabilita le foreign keys anche in caso di errore
          try {
            await client.execute("PRAGMA foreign_keys = ON");
          } catch (fkError) {
            console.error('Error re-enabling foreign keys:', fkError);
          }
          throw deleteError;
        }
        
      } catch (error) {
        console.error('DELETE error:', error);
        return res.status(500).json({
          error: 'Errore nell\'eliminazione dell\'orario',
          details: error.message,
          stack: error.stack
        });
      }
      default:
        return res.status(405).json({ 
          error: 'Metodo non consentito' 
        });
    }
  } catch (globalError) {
    console.error('Global API error:', globalError);
    return res.status(500).json({ 
      error: 'Errore interno del server',
      details: globalError.message,
      stack: globalError.stack
    });
  }
}