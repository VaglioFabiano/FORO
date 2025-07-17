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
        // Ottieni tutti gli orari della settimana ordinati per giorno
        const orari = await client.execute(`
          SELECT 
            fo.id,
            fo.giorno,
            fo.ora_inizio,
            fo.ora_fine,
            fo.note
          FROM fasce_orarie fo
          ORDER BY 
            CASE fo.giorno 
              WHEN 'lunedì' THEN 1
              WHEN 'martedì' THEN 2
              WHEN 'mercoledì' THEN 3
              WHEN 'giovedì' THEN 4
              WHEN 'venerdì' THEN 5
              WHEN 'sabato' THEN 6
              WHEN 'domenica' THEN 7
            END,
            fo.ora_inizio
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
        
        // Verifica che il giorno esista nella tabella giorni_settimana
        const giornoExists = await client.execute({
          sql: 'SELECT giorno FROM giorni_settimana WHERE giorno = ?',
          args: [giorno]
        });
        
        if (giornoExists.rows.length === 0) {
          return res.status(400).json({ 
            error: 'Giorno non valido' 
          });
        }
        
        const newOrario = await client.execute({
          sql: 'INSERT INTO fasce_orarie (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?) RETURNING *',
          args: [giorno, ora_inizio, ora_fine, note || null]
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
          updateArgs.push(updateGiorno);
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
          sql: `UPDATE fasce_orarie SET ${updateFields.join(', ')} WHERE id = ? RETURNING *`,
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
        
        if (!deleteId) {
          return res.status(400).json({ 
            error: 'ID è richiesto' 
          });
        }
        
        const deleteResult = await client.execute({
          sql: 'DELETE FROM fasce_orarie WHERE id = ?',
          args: [deleteId]
        });
        
        if (deleteResult.rowsAffected === 0) {
          return res.status(404).json({ 
            error: 'Fascia oraria non trovata' 
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Fascia oraria eliminata' 
        });

      default:
        return res.status(405).json({ 
          error: 'Metodo non consentito' 
        });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Operazione sul database fallita',
      details: error.message
    });
  }
}