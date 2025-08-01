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

// Funzione per inserire dati di default
async function insertDefaultData() {
  try {
    // Controlla se esiste già un record header
    const headerExists = await client.execute('SELECT COUNT(*) as count FROM header');
    if (headerExists.rows[0].count === 0) {
      await client.execute({
        sql: 'INSERT INTO header (descrizione) VALUES (?)',
        args: ['Siamo uno spazio gestito da volontari, dedicato allo studio silenzioso e allo studio ad alta voce: un ambiente accogliente dove ognuno può concentrarsi o confrontarsi nel rispetto reciproco.']
      });
    }

    // Inserisci dati di default per altre tabelle se vuote
    const socialExists = await client.execute('SELECT COUNT(*) as count FROM sezione_social');
    if (socialExists.rows[0].count === 0) {
      await client.execute({
        sql: 'INSERT INTO sezione_social (post_instagram, post_facebook, canale_telegram) VALUES (?, ?, ?)',
        args: ['', '', '']
      });
    }

    const statutoExists = await client.execute('SELECT COUNT(*) as count FROM statuto');
    if (statutoExists.rows[0].count === 0) {
      await client.execute({
        sql: 'INSERT INTO statuto (link_drive) VALUES (?)',
        args: ['']
      });
    }

    const conosciExists = await client.execute('SELECT COUNT(*) as count FROM conoscici');
    if (conosciExists.rows[0].count === 0) {
      await client.execute({
        sql: 'INSERT INTO conoscici (file1, file2, file3) VALUES (?, ?, ?)',
        args: ['', '', '']
      });
    }

    const contattiExists = await client.execute('SELECT COUNT(*) as count FROM contatti_footer');
    if (contattiExists.rows[0].count === 0) {
      await client.execute({
        sql: 'INSERT INTO contatti_footer (link_instagram, link_facebook, link_telegram, email) VALUES (?, ?, ?, ?)',
        args: ['', '', '', '']
      });
    }
  } catch (error) {
    console.error('Errore nell\'inserimento dati di default:', error);
  }
}

// GET - Ottieni tutti i dati della homepage
async function getHomepageData(req, res) {
  try {
    await insertDefaultData();

    // Recupera dati da tutte le tabelle (prende il primo e unico record)
    const headerResult = await client.execute('SELECT * FROM header LIMIT 1');
    const socialResult = await client.execute('SELECT * FROM sezione_social LIMIT 1');
    const statutoResult = await client.execute('SELECT * FROM statuto LIMIT 1');
    const conosciResult = await client.execute('SELECT * FROM conoscici LIMIT 1');
    const segnalazioniResult = await client.execute('SELECT ROWID, * FROM segnalazioni');
    const contattiResult = await client.execute('SELECT * FROM contatti_footer LIMIT 1');

    return res.status(200).json({
      success: true,
      header: headerResult.rows[0] || { descrizione: '' },
      social: socialResult.rows[0] || { post_instagram: '', post_facebook: '', canale_telegram: '' },
      statuto: statutoResult.rows[0] || { link_drive: '' },
      conoscici: conosciResult.rows[0] || { file1: '', file2: '', file3: '' },
      segnalazioni: segnalazioniResult.rows || [],
      contatti: contattiResult.rows[0] || { link_instagram: '', link_facebook: '', link_telegram: '', email: '' }
    });

  } catch (error) {
    console.error('Errore nel recupero dati homepage:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// POST - Aggiorna dati della homepage
async function updateHomepageData(req, res) {
  try {
    const { type, data, user_id } = req.body;

    console.log('Received data:', { type, data, user_id }); // Debug

    if (!type || !data || (user_id === undefined || user_id === null)) {
      return res.status(400).json({
        success: false,
        error: 'Dati mancanti (type, data, user_id richiesti)'
      });
    }

    // Verifica permessi utente (con controllo se la tabella users esiste)
    if (user_id !== undefined && user_id !== null) {
      try {
        const userResult = await client.execute({
          sql: 'SELECT level FROM users WHERE id = ?',
          args: [user_id]
        });

        if (!userResult.rows.length) {
          console.log(`User with ID ${user_id} not found, continuing anyway`);
          // Non bloccare se l'utente non è trovato (per sviluppo)
        } else {
          const userLevel = userResult.rows[0].level;
          if (userLevel !== 0 && userLevel !== 1 && userLevel !== 2) {
            return res.status(403).json({
              success: false,
              error: 'Non hai i permessi per modificare la homepage'
            });
          }
        }
      } catch (userError) {
        console.error('Errore nella verifica utente:', userError);
        // Se la tabella users non esiste, continua comunque (per sviluppo)
        console.log('Continuando senza verifica permessi - tabella users potrebbe non esistere');
      }
    }

    await insertDefaultData();

    let result;

    switch (type) {
      case 'header':
        console.log('Processing header update:', data); // Debug
        
        if (data.descrizione === undefined || data.descrizione === null) {
          return res.status(400).json({
            success: false,
            error: 'Descrizione mancante o non valida'
          });
        }
        
        // Prima controlla se esiste un record, poi aggiorna o inserisce
        const headerExists = await client.execute('SELECT COUNT(*) as count FROM header');
        console.log('Header exists check:', headerExists.rows[0]); // Debug
        
        if (headerExists.rows[0].count > 0) {
          console.log('Updating existing header record'); // Debug
          result = await client.execute({
            sql: 'UPDATE header SET descrizione = ?',
            args: [data.descrizione]
          });
        } else {
          console.log('Inserting new header record'); // Debug
          result = await client.execute({
            sql: 'INSERT INTO header (descrizione) VALUES (?)',
            args: [data.descrizione]
          });
        }
        console.log('Header operation result:', result); // Debug
        break;

      case 'social':
        const socialExists = await client.execute('SELECT COUNT(*) as count FROM sezione_social');
        if (socialExists.rows[0].count > 0) {
          result = await client.execute({
            sql: 'UPDATE sezione_social SET post_instagram = ?, post_facebook = ?, canale_telegram = ?',
            args: [
              data.post_instagram || '', 
              data.post_facebook || '', 
              data.canale_telegram || ''
            ]
          });
        } else {
          result = await client.execute({
            sql: 'INSERT INTO sezione_social (post_instagram, post_facebook, canale_telegram) VALUES (?, ?, ?)',
            args: [
              data.post_instagram || '', 
              data.post_facebook || '', 
              data.canale_telegram || ''
            ]
          });
        }
        break;

      case 'statuto':
        const statutoExists = await client.execute('SELECT COUNT(*) as count FROM statuto');
        if (statutoExists.rows[0].count > 0) {
          result = await client.execute({
            sql: 'UPDATE statuto SET link_drive = ?',
            args: [data.link_drive || '']
          });
        } else {
          result = await client.execute({
            sql: 'INSERT INTO statuto (link_drive) VALUES (?)',
            args: [data.link_drive || '']
          });
        }
        break;

      case 'conoscici':
        const conosciExists = await client.execute('SELECT COUNT(*) as count FROM conoscici');
        if (conosciExists.rows[0].count > 0) {
          result = await client.execute({
            sql: 'UPDATE conoscici SET file1 = ?, file2 = ?, file3 = ?',
            args: [
              data.file1 || '', 
              data.file2 || '', 
              data.file3 || ''
            ]
          });
        } else {
          result = await client.execute({
            sql: 'INSERT INTO conoscici (file1, file2, file3) VALUES (?, ?, ?)',
            args: [
              data.file1 || '', 
              data.file2 || '', 
              data.file3 || ''
            ]
          });
        }
        break;

      case 'segnalazioni':
        // Aggiunge sempre una nuova segnalazione
        if (data.immagine || data.link) {
          result = await client.execute({
            sql: 'INSERT INTO segnalazioni (immagine, link) VALUES (?, ?)',
            args: [
              data.immagine || '', 
              data.link || ''
            ]
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Dati segnalazione mancanti'
          });
        }
        break;

      case 'contatti':
        const contattiExists = await client.execute('SELECT COUNT(*) as count FROM contatti_footer');
        if (contattiExists.rows[0].count > 0) {
          result = await client.execute({
            sql: 'UPDATE contatti_footer SET link_instagram = ?, link_facebook = ?, link_telegram = ?, email = ?',
            args: [
              data.link_instagram || '', 
              data.link_facebook || '', 
              data.link_telegram || '', 
              data.email || ''
            ]
          });
        } else {
          result = await client.execute({
            sql: 'INSERT INTO contatti_footer (link_instagram, link_facebook, link_telegram, email) VALUES (?, ?, ?, ?)',
            args: [
              data.link_instagram || '', 
              data.link_facebook || '', 
              data.link_telegram || '', 
              data.email || ''
            ]
          });
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Tipo di aggiornamento non supportato'
        });
    }

    console.log('Query result:', result); // Debug

    if (result.rowsAffected > 0) {
      return res.status(200).json({
        success: true,
        message: `${type} aggiornato con successo`,
        type: type,
        updated_at: new Date().toISOString()
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Nessuna modifica effettuata'
      });
    }

  } catch (error) {
    console.error('Errore nell\'aggiornamento homepage:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server: ' + error.message
    });
  }
}

// DELETE - Elimina una segnalazione
async function deleteSegnalazione(req, res) {
  try {
    const { id, user_id } = req.body;

    if (!id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'ID segnalazione e user_id richiesti'
      });
    }

    // Verifica permessi utente
    const userResult = await client.execute({
      sql: 'SELECT level FROM users WHERE id = ?',
      args: [user_id]
    });

    if (!userResult.rows.length || (userResult.rows[0].level !== 0 && userResult.rows[0].level !== 1)) {
      return res.status(403).json({
        success: false,
        error: 'Non hai i permessi per eliminare segnalazioni'
      });
    }

    // Usa ROWID per identificare il record da eliminare
    const result = await client.execute({
      sql: 'DELETE FROM segnalazioni WHERE ROWID = ?',
      args: [id]
    });

    if (result.rowsAffected > 0) {
      return res.status(200).json({
        success: true,
        message: 'Segnalazione eliminata con successo'
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Segnalazione non trovata'
      });
    }

  } catch (error) {
    console.error('Errore nell\'eliminazione segnalazione:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// GET - Ottieni solo i dati dell'header (per il componente Header)
async function getHeaderData(req, res) {
  try {
    await insertDefaultData();
    
    const headerResult = await client.execute('SELECT descrizione FROM header LIMIT 1');
    
    return res.status(200).json({
      success: true,
      descrizione: headerResult.rows[0]?.descrizione || 'Siamo uno spazio gestito da volontari, dedicato allo studio silenzioso e allo studio ad alta voce: un ambiente accogliente dove ognuno può concentrarsi o confrontarsi nel rispetto reciproco.'
    });

  } catch (error) {
    console.error('Errore nel recupero dati header:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server',
      descrizione: 'Siamo uno spazio gestito da volontari, dedicato allo studio silenzioso e allo studio ad alta voce: un ambiente accogliente dove ognuno può concentrarsi o confrontarsi nel rispetto reciproco.'
    });
  }
}

// GET - Ottieni tutte le segnalazioni
async function getSegnalazioni(req, res) {
  try {
    await insertDefaultData();
    
    // Usa ROWID per avere un identificatore unico
    const segnalazioniResult = await client.execute('SELECT ROWID, * FROM segnalazioni');
    
    return res.status(200).json({
      success: true,
      segnalazioni: segnalazioniResult.rows
    });

  } catch (error) {
    console.error('Errore nel recupero segnalazioni:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// Handler principale
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test connessione DB
    await client.execute("SELECT 1");
    
    // Route per ottenere solo i dati header (per il componente Header)
    if (req.method === 'GET' && req.query.section === 'header') {
      return await getHeaderData(req, res);
    }
    
    // Route per ottenere tutte le segnalazioni
    if (req.method === 'GET' && req.query.section === 'segnalazioni') {
      return await getSegnalazioni(req, res);
    }
    
    switch (req.method) {
      case 'GET':
        return await getHomepageData(req, res);
      case 'POST':
        return await updateHomepageData(req, res);
      case 'DELETE':
        if (req.query.section === 'segnalazioni') {
          return await deleteSegnalazione(req, res);
        }
        return res.status(400).json({ 
          success: false, 
          error: 'Azione non supportata' 
        });
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Metodo non supportato' 
        });
    }
  } catch (error) {
    console.error('Errore API homepage:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Errore interno del server: ' + error.message
    });
  }
}