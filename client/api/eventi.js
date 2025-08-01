import { createClient } from '@libsql/client/web';

// Configurazione database
const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim()
};

if (!config.url || !config.authToken) {
  console.error("Mancano le variabili d'ambiente per il DB!");
  throw new Error("Configurazione database mancante");
}

const client = createClient(config);

// Funzione helper per convertire BigInt in numeri normali
function convertBigIntToNumber(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }
  
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToNumber(value);
    }
    return converted;
  }
  
  return obj;
}

// Handler principale
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
    
    const { section, action, id, evento_id } = req.query;
    console.log('API Request:', { method: req.method, section, action, id, evento_id });

    if (req.method === 'GET') {
      // GET eventi
      if (!section && !action) {
        console.log('Getting all eventi');
        const eventiResult = await client.execute(`
          SELECT id, titolo, descrizione, data_evento, immagine_url 
          FROM eventi 
          ORDER BY data_evento ASC
        `);
        
        const eventiConverted = convertBigIntToNumber(eventiResult.rows);
        
        return res.status(200).json({
          success: true,
          eventi: eventiConverted
        });
      }
      
      // GET singolo evento con prenotazioni
      if (action === 'single' && id) {
        console.log('Getting single evento:', id);
        
        const eventoResult = await client.execute({
          sql: 'SELECT * FROM eventi WHERE id = ?',
          args: [id]
        });

        if (!eventoResult.rows.length) {
          return res.status(404).json({
            success: false,
            error: 'Evento non trovato'
          });
        }

        // CORREZIONE: Usa il nome corretto della tabella
        const prenotazioniResult = await client.execute({
          sql: 'SELECT * FROM prenotazioni_eventi WHERE evento_id = ? ORDER BY data_prenotazione DESC',
          args: [id]
        });

        const eventoConverted = convertBigIntToNumber(eventoResult.rows[0]);
        const prenotazioniConverted = convertBigIntToNumber(prenotazioniResult.rows);

        return res.status(200).json({
          success: true,
          evento: eventoConverted,
          prenotazioni: prenotazioniConverted
        });
      }
      
      // GET prenotazioni per un evento
      if (section === 'prenotazioni' && evento_id) {
        console.log('Getting prenotazioni for evento:', evento_id);
        
        const eventoExists = await client.execute({
          sql: 'SELECT id, titolo FROM eventi WHERE id = ?',
          args: [evento_id]
        });

        if (!eventoExists.rows.length) {
          return res.status(404).json({
            success: false,
            error: 'Evento non trovato'
          });
        }

        // CORREZIONE: Usa il nome corretto della tabella
        const prenotazioniResult = await client.execute({
          sql: 'SELECT * FROM prenotazioni_eventi WHERE evento_id = ? ORDER BY data_prenotazione DESC',
          args: [evento_id]
        });

        const eventoConverted = convertBigIntToNumber(eventoExists.rows[0]);
        const prenotazioniConverted = convertBigIntToNumber(prenotazioniResult.rows);

        return res.status(200).json({
          success: true,
          evento: eventoConverted,
          prenotazioni: prenotazioniConverted
        });
      }
    }

    if (req.method === 'POST') {
      const { titolo, descrizione, data_evento, immagine_url, user_id } = req.body;
      console.log('Creating evento:', { titolo, descrizione, data_evento, immagine_url, user_id });

      if (!titolo || !data_evento || (user_id === undefined || user_id === null)) {
        return res.status(400).json({
          success: false,
          error: 'Titolo, data_evento e user_id sono richiesti'
        });
      }

      // Valida formato data (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data_evento)) {
        return res.status(400).json({
          success: false,
          error: 'Formato data non valido. Utilizzare YYYY-MM-DD'
        });
      }

      const result = await client.execute({
        sql: 'INSERT INTO eventi (titolo, descrizione, data_evento, immagine_url) VALUES (?, ?, ?, ?)',
        args: [
          titolo,
          descrizione || '',
          data_evento,
          immagine_url || ''
        ]
      });

      if (result.rowsAffected > 0) {
        return res.status(201).json({
          success: true,
          message: 'Evento creato con successo',
          evento_id: convertBigIntToNumber(result.lastInsertRowid),
          created_at: new Date().toISOString()
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Errore nella creazione dell\'evento'
        });
      }
    }

    if (req.method === 'PUT') {
      const { id, titolo, descrizione, data_evento, immagine_url, user_id } = req.body;
      console.log('Updating evento:', { id, titolo, descrizione, data_evento, immagine_url, user_id });

      if (!id || !titolo || !data_evento || (user_id === undefined || user_id === null)) {
        return res.status(400).json({
          success: false,
          error: 'ID, titolo, data_evento e user_id sono richiesti'
        });
      }

      // Valida formato data (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data_evento)) {
        return res.status(400).json({
          success: false,
          error: 'Formato data non valido. Utilizzare YYYY-MM-DD'
        });
      }

      // Verifica che l'evento esista
      const eventoExists = await client.execute({
        sql: 'SELECT id FROM eventi WHERE id = ?',
        args: [id]
      });

      if (!eventoExists.rows.length) {
        return res.status(404).json({
          success: false,
          error: 'Evento non trovato'
        });
      }

      const result = await client.execute({
        sql: 'UPDATE eventi SET titolo = ?, descrizione = ?, data_evento = ?, immagine_url = ? WHERE id = ?',
        args: [
          titolo,
          descrizione || '',
          data_evento,
          immagine_url || '',
          id
        ]
      });

      if (result.rowsAffected > 0) {
        return res.status(200).json({
          success: true,
          message: 'Evento aggiornato con successo',
          updated_at: new Date().toISOString()
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Nessuna modifica effettuata'
        });
      }
    }

    if (req.method === 'DELETE') {
      // DELETE prenotazione
      if (section === 'prenotazioni') {
        const { id, user_id } = req.body;
        console.log('Deleting prenotazione:', { id, user_id });

        if (!id || !user_id) {
          return res.status(400).json({
            success: false,
            error: 'ID prenotazione e user_id richiesti'
          });
        }

        // CORREZIONE: Usa il nome corretto della tabella
        const result = await client.execute({
          sql: 'DELETE FROM prenotazioni_eventi WHERE id = ?',
          args: [id]
        });

        if (result.rowsAffected > 0) {
          return res.status(200).json({
            success: true,
            message: 'Prenotazione eliminata con successo'
          });
        } else {
          return res.status(404).json({
            success: false,
            error: 'Prenotazione non trovata'
          });
        }
      }
      
      // DELETE evento
      else {
        const { id, user_id } = req.body;
        console.log('Deleting evento:', { id, user_id });

        if (!id || !user_id) {
          return res.status(400).json({
            success: false,
            error: 'ID evento e user_id richiesti'
          });
        }

        // Verifica che l'evento esista
        const eventoExists = await client.execute({
          sql: 'SELECT id FROM eventi WHERE id = ?',
          args: [id]
        });

        if (!eventoExists.rows.length) {
          return res.status(404).json({
            success: false,
            error: 'Evento non trovato'
          });
        }

        const result = await client.execute({
          sql: 'DELETE FROM eventi WHERE id = ?',
          args: [id]
        });

        if (result.rowsAffected > 0) {
          return res.status(200).json({
            success: true,
            message: 'Evento eliminato con successo'
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Errore nell\'eliminazione dell\'evento'
          });
        }
      }
    }

    return res.status(405).json({ 
      success: false, 
      error: 'Metodo non supportato' 
    });
    
  } catch (error) {
    console.error('Errore API eventi:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Errore interno del server: ' + error.message
    });
  }
}