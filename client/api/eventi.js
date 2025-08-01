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
    
    const { section, action } = req.query;

    // Routes per eventi
    if (section === 'eventi' || (!section && req.method === 'GET')) {
      switch (req.method) {
        case 'GET':
          if (action === 'single') {
            return await getSingoloEvento(req, res);
          }
          return await getEventi(req, res);
        case 'POST':
          return await creaEvento(req, res);
        case 'PUT':
          return await aggiornaEvento(req, res);
        case 'DELETE':
          return await eliminaEvento(req, res);
        default:
          return res.status(405).json({ 
            success: false, 
            error: 'Metodo non supportato per eventi' 
          });
      }
    }

    // Routes per prenotazioni
    if (section === 'prenotazioni') {
      switch (req.method) {
        case 'GET':
          return await getPrenotazioni(req, res);
        case 'POST':
          return await creaPrenotazione(req, res);
        case 'DELETE':
          return await eliminaPrenotazione(req, res);
        default:
          return res.status(405).json({ 
            success: false, 
            error: 'Metodo non supportato per prenotazioni' 
          });
      }
    }

    // Default: ottieni tutti gli eventi se non è specificata una sezione
    if (req.method === 'GET') {
      return await getEventi(req, res);
    }

    return res.status(400).json({ 
      success: false, 
      error: 'Sezione non specificata. Utilizzare ?section=eventi o ?section=prenotazioni' 
    });

  } catch (error) {
    console.error('Errore API eventi:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Errore interno del server: ' + error.message
    });
  }
}

// GET - Ottieni tutti gli eventi
async function getEventi(req, res) {
  try {
    const eventiResult = await client.execute(`
      SELECT id, titolo, descrizione, data_evento, immagine_url 
      FROM eventi 
      ORDER BY data_evento ASC
    `);
    
    return res.status(200).json({
      success: true,
      eventi: eventiResult.rows
    });

  } catch (error) {
    console.error('Errore nel recupero eventi:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// GET - Ottieni un singolo evento con le sue prenotazioni
async function getSingoloEvento(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID evento richiesto'
      });
    }

    // Recupera evento
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

    // Recupera prenotazioni per questo evento
    const prenotazioniResult = await client.execute({
      sql: 'SELECT * FROM prenotazioni WHERE evento_id = ? ORDER BY data_prenotazione DESC',
      args: [id]
    });

    return res.status(200).json({
      success: true,
      evento: eventoResult.rows[0],
      prenotazioni: prenotazioniResult.rows
    });

  } catch (error) {
    console.error('Errore nel recupero evento:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// POST - Crea un nuovo evento
async function creaEvento(req, res) {
  try {
    const { titolo, descrizione, data_evento, immagine_url, user_id } = req.body;

    console.log('Received evento data:', { titolo, descrizione, data_evento, immagine_url, user_id });

    if (!titolo || !data_evento || (user_id === undefined || user_id === null)) {
      return res.status(400).json({
        success: false,
        error: 'Titolo, data_evento e user_id sono richiesti'
      });
    }

    // Verifica permessi utente
    if (user_id !== undefined && user_id !== null) {
      try {
        const userResult = await client.execute({
          sql: 'SELECT level FROM users WHERE id = ?',
          args: [user_id]
        });

        if (!userResult.rows.length) {
          console.log(`User with ID ${user_id} not found, continuing anyway`);
        } else {
          const userLevel = userResult.rows[0].level;
          if (userLevel !== 0 && userLevel !== 1 && userLevel !== 2) {
            return res.status(403).json({
              success: false,
              error: 'Non hai i permessi per creare eventi'
            });
          }
        }
      } catch (userError) {
        console.error('Errore nella verifica utente:', userError);
        console.log('Continuando senza verifica permessi - tabella users potrebbe non esistere');
      }
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
        evento_id: result.lastInsertRowid,
        created_at: new Date().toISOString()
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Errore nella creazione dell\'evento'
      });
    }

  } catch (error) {
    console.error('Errore nella creazione evento:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server: ' + error.message
    });
  }
}

// PUT - Aggiorna un evento esistente
async function aggiornaEvento(req, res) {
  try {
    const { id, titolo, descrizione, data_evento, immagine_url, user_id } = req.body;

    if (!id || !titolo || !data_evento || (user_id === undefined || user_id === null)) {
      return res.status(400).json({
        success: false,
        error: 'ID, titolo, data_evento e user_id sono richiesti'
      });
    }

    // Verifica permessi utente
    if (user_id !== undefined && user_id !== null) {
      try {
        const userResult = await client.execute({
          sql: 'SELECT level FROM users WHERE id = ?',
          args: [user_id]
        });

        if (!userResult.rows.length) {
          console.log(`User with ID ${user_id} not found, continuing anyway`);
        } else {
          const userLevel = userResult.rows[0].level;
          if (userLevel !== 0 && userLevel !== 1 && userLevel !== 2) {
            return res.status(403).json({
              success: false,
              error: 'Non hai i permessi per modificare eventi'
            });
          }
        }
      } catch (userError) {
        console.error('Errore nella verifica utente:', userError);
        console.log('Continuando senza verifica permessi - tabella users potrebbe non esistere');
      }
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

  } catch (error) {
    console.error('Errore nell\'aggiornamento evento:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server: ' + error.message
    });
  }
}

// DELETE - Elimina un evento
async function eliminaEvento(req, res) {
  try {
    const { id, user_id } = req.body;

    if (!id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'ID evento e user_id richiesti'
      });
    }

    // Verifica permessi utente
    const userResult = await client.execute({
      sql: 'SELECT level FROM users WHERE id = ?',
      args: [user_id]
    });

    if (!userResult.rows.length || (userResult.rows[0].level !== 0 && userResult.rows[0].level !== 1 && userResult.rows[0].level !== 2)) {
      return res.status(403).json({
        success: false,
        error: 'Non hai i permessi per eliminare eventi'
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

    // Elimina l'evento (le prenotazioni verranno eliminate automaticamente per la FOREIGN KEY CASCADE)
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

  } catch (error) {
    console.error('Errore nell\'eliminazione evento:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// GET - Ottieni prenotazioni per un evento specifico
async function getPrenotazioni(req, res) {
  try {
    const { evento_id } = req.query;

    if (!evento_id) {
      return res.status(400).json({
        success: false,
        error: 'evento_id richiesto'
      });
    }

    // Verifica che l'evento esista
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

    const prenotazioniResult = await client.execute({
      sql: 'SELECT * FROM prenotazioni WHERE evento_id = ? ORDER BY data_prenotazione DESC',
      args: [evento_id]
    });

    return res.status(200).json({
      success: true,
      evento: eventoExists.rows[0],
      prenotazioni: prenotazioniResult.rows
    });

  } catch (error) {
    console.error('Errore nel recupero prenotazioni:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// POST - Crea una nuova prenotazione
async function creaPrenotazione(req, res) {
  try {
    const { evento_id, nome, cognome, email } = req.body;

    console.log('Received prenotazione data:', { evento_id, nome, cognome, email });

    if (!evento_id || !nome || !cognome || !email) {
      return res.status(400).json({
        success: false,
        error: 'Evento_id, nome, cognome ed email sono richiesti'
      });
    }

    // Valida formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Formato email non valido'
      });
    }

    // Verifica che l'evento esista
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

    // Verifica se esiste già una prenotazione con la stessa email per questo evento
    const prenotazioneExists = await client.execute({
      sql: 'SELECT id FROM prenotazioni WHERE evento_id = ? AND email = ?',
      args: [evento_id, email]
    });

    if (prenotazioneExists.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Esiste già una prenotazione con questa email per questo evento'
      });
    }

    const result = await client.execute({
      sql: 'INSERT INTO prenotazioni (evento_id, nome, cognome, email) VALUES (?, ?, ?, ?)',
      args: [evento_id, nome, cognome, email]
    });

    if (result.rowsAffected > 0) {
      return res.status(201).json({
        success: true,
        message: 'Prenotazione creata con successo',
        prenotazione_id: result.lastInsertRowid,
        evento_titolo: eventoExists.rows[0].titolo,
        created_at: new Date().toISOString()
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Errore nella creazione della prenotazione'
      });
    }

  } catch (error) {
    console.error('Errore nella creazione prenotazione:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server: ' + error.message
    });
  }
}

// DELETE - Elimina una prenotazione
async function eliminaPrenotazione(req, res) {
  try {
    const { id, user_id } = req.body;

    if (!id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'ID prenotazione e user_id richiesti'
      });
    }

    // Verifica permessi utente
    const userResult = await client.execute({
      sql: 'SELECT level FROM users WHERE id = ?',
      args: [user_id]
    });

    if (!userResult.rows.length || (userResult.rows[0].level !== 0 && userResult.rows[0].level !== 1 && userResult.rows[0].level !== 2)) {
      return res.status(403).json({
        success: false,
        error: 'Non hai i permessi per eliminare prenotazioni'
      });
    }

    // Verifica che la prenotazione esista
    const prenotazioneExists = await client.execute({
      sql: 'SELECT id FROM prenotazioni WHERE id = ?',
      args: [id]
    });

    if (!prenotazioneExists.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Prenotazione non trovata'
      });
    }

    const result = await client.execute({
      sql: 'DELETE FROM prenotazioni WHERE id = ?',
      args: [id]
    });

    if (result.rowsAffected > 0) {
      return res.status(200).json({
        success: true,
        message: 'Prenotazione eliminata con successo'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Errore nell\'eliminazione della prenotazione'
      });
    }

  } catch (error) {
    console.error('Errore nell\'eliminazione prenotazione:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}