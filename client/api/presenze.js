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

// Fasce orarie disponibili
const FASCE_ORARIE = ['9-13', '13-16', '16-19', '21-24'];

// Funzione per ottenere i giorni di un mese specifico
function getMonthDates(monthOffset = 0) {
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  // Primo giorno del mese
  const firstDay = new Date(year, month, 1);
  // Ultimo giorno del mese
  const lastDay = new Date(year, month + 1, 0);
  
  const monthDates = [];
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    monthDates.push(new Date(d).toISOString().split('T')[0]);
  }
  
  return {
    dates: monthDates,
    monthName: targetDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
    year: year,
    month: month + 1 // JavaScript months are 0-based
  };
}

// Funzione per ottenere il mese corrente
function getCurrentMonth() {
  return getMonthDates(0);
}

// Funzione per ottenere il mese precedente
function getPreviousMonth() {
  return getMonthDates(-1);
}

// Funzione per ottenere il mese successivo
function getNextMonth() {
  return getMonthDates(1);
}

// Handler per log delle modifiche
async function logPresenzeChange(presenzeId, data, fasciaOraria, oldValue, newValue, userId, action) {
  try {
    await client.execute({
      sql: `INSERT INTO presenze_log (presenze_id, data, fascia_oraria, numero_presenze_old, numero_presenze_new, user_id, action)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [presenzeId, data, fasciaOraria, oldValue, newValue, userId, action]
    });
  } catch (error) {
    console.error('Errore nel log delle presenze:', error);
  }
}

// GET - Ottieni presenze del mese
async function getPresenze(req, res) {
  try {
    const { mese } = req.query; // 'corrente', 'precedente', 'successivo', o 'YYYY-MM'
    
    let monthData;
    
    if (mese === 'precedente') {
      monthData = getPreviousMonth();
    } else if (mese === 'successivo') {
      monthData = getNextMonth();
    } else if (mese && mese.match(/^\d{4}-\d{2}$/)) {
      // Formato YYYY-MM specifico
      const [year, month] = mese.split('-').map(Number);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const monthOffset = (year - currentYear) * 12 + (month - currentMonth);
      monthData = getMonthDates(monthOffset);
    } else {
      monthData = getCurrentMonth();
    }
    
    // Ottieni presenze esistenti per il mese
    const presenzeResult = await client.execute({
      sql: `SELECT p.id, p.data, p.fascia_oraria, p.numero_presenze, p.note, p.user_id,
                   u.name, u.surname, u.username
            FROM presenze p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.data >= ? AND p.data <= ?
            ORDER BY p.data, p.fascia_oraria`,
      args: [monthData.dates[0], monthData.dates[monthData.dates.length - 1]]
    });

    // Crea struttura completa con tutti i giorni e fasce
    const presenzeComplete = [];
    
    monthData.dates.forEach(data => {
      const dayOfWeek = new Date(data).getDay(); // 0 = Domenica, 1 = Lunedì, etc.
      
      FASCE_ORARIE.forEach(fascia => {
        const esistente = presenzeResult.rows.find(p => 
          p.data === data && p.fascia_oraria === fascia
        );

        presenzeComplete.push({
          id: esistente?.id || null,
          data: data,
          fascia_oraria: fascia,
          numero_presenze: esistente?.numero_presenze || 0,
          note: esistente?.note || '',
          user_id: esistente?.user_id || null,
          user_name: esistente?.name || '',
          user_surname: esistente?.surname || '',
          user_username: esistente?.username || '',
          day_of_week: dayOfWeek,
          esistente: !!esistente
        });
      });
    });

    return res.status(200).json({
      success: true,
      presenze: presenzeComplete,
      month_info: monthData,
      mese: mese || 'corrente'
    });

  } catch (error) {
    console.error('Errore nel recupero presenze:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// POST - Aggiorna presenze
async function aggiornaPresenze(req, res) {
  try {
    const { data, fascia_oraria, numero_presenze, note, current_user_id } = req.body;

    if (!data || !fascia_oraria || numero_presenze === undefined || numero_presenze === null) {
      return res.status(400).json({
        success: false,
        error: 'Dati mancanti'
      });
    }

    // Validazione numero presenze
    const numeroPresenze = parseInt(numero_presenze);
    if (isNaN(numeroPresenze) || numeroPresenze < 0) {
      return res.status(400).json({
        success: false,
        error: 'Numero presenze deve essere un numero positivo'
      });
    }

    // Verifica se esiste già un record
    const esistente = await client.execute({
      sql: 'SELECT id, numero_presenze FROM presenze WHERE data = ? AND fascia_oraria = ?',
      args: [data, fascia_oraria]
    });

    let result;
    let action;

    if (esistente.rows.length > 0) {
      const oldValue = esistente.rows[0].numero_presenze;
      
      // Aggiorna record esistente
      result = await client.execute({
        sql: `UPDATE presenze SET numero_presenze = ?, note = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE data = ? AND fascia_oraria = ?
              RETURNING id, data, fascia_oraria, numero_presenze, note, user_id`,
        args: [numeroPresenze, note || '', current_user_id, data, fascia_oraria]
      });

      action = 'UPDATE';
      
      // Log della modifica
      await logPresenzeChange(
        esistente.rows[0].id, 
        data, 
        fascia_oraria, 
        oldValue, 
        numeroPresenze, 
        current_user_id, 
        action
      );
    } else {
      // Crea nuovo record
      result = await client.execute({
        sql: `INSERT INTO presenze (data, fascia_oraria, numero_presenze, note, user_id)
              VALUES (?, ?, ?, ?, ?)
              RETURNING id, data, fascia_oraria, numero_presenze, note, user_id`,
        args: [data, fascia_oraria, numeroPresenze, note || '', current_user_id]
      });

      action = 'INSERT';
      
      // Log dell'inserimento
      await logPresenzeChange(
        result.rows[0].id, 
        data, 
        fascia_oraria, 
        null, 
        numeroPresenze, 
        current_user_id, 
        action
      );
    }

    return res.status(200).json({
      success: true,
      presenza: result.rows[0],
      action: action.toLowerCase()
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento presenze:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// DELETE - Elimina presenza (opzionale)
async function eliminaPresenza(req, res) {
  try {
    const { data, fascia_oraria, current_user_id } = req.body;

    if (!data || !fascia_oraria) {
      return res.status(400).json({
        success: false,
        error: 'Dati mancanti'
      });
    }

    // Ottieni info prima di eliminare per il log
    const esistente = await client.execute({
      sql: 'SELECT id, numero_presenze FROM presenze WHERE data = ? AND fascia_oraria = ?',
      args: [data, fascia_oraria]
    });

    if (esistente.rows.length > 0) {
      const oldValue = esistente.rows[0].numero_presenze;
      
      const result = await client.execute({
        sql: 'DELETE FROM presenze WHERE data = ? AND fascia_oraria = ?',
        args: [data, fascia_oraria]
      });

      // Log dell'eliminazione
      if (result.rowsAffected > 0) {
        await logPresenzeChange(
          esistente.rows[0].id, 
          data, 
          fascia_oraria, 
          oldValue, 
          null, 
          current_user_id, 
          'DELETE'
        );
      }

      return res.status(200).json({
        success: true,
        deleted: result.rowsAffected > 0
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Presenza non trovata'
      });
    }

  } catch (error) {
    console.error('Errore nell\'eliminazione presenza:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// GET - Ottieni statistiche mensili
async function getStatistiche(req, res) {
  try {
    const { mese } = req.query;
    
    let monthData;
    if (mese === 'precedente') {
      monthData = getPreviousMonth();
    } else if (mese === 'successivo') {
      monthData = getNextMonth();
    } else {
      monthData = getCurrentMonth();
    }

    // Statistiche per fascia oraria
    const statsResult = await client.execute({
      sql: `SELECT 
              fascia_oraria,
              SUM(numero_presenze) as totale_presenze,
              AVG(numero_presenze) as media_presenze,
              MAX(numero_presenze) as max_presenze,
              COUNT(*) as giorni_registrati
            FROM presenze 
            WHERE data >= ? AND data <= ? AND numero_presenze > 0
            GROUP BY fascia_oraria
            ORDER BY fascia_oraria`,
      args: [monthData.dates[0], monthData.dates[monthData.dates.length - 1]]
    });

    // Totale mensile
    const totaleResult = await client.execute({
      sql: `SELECT 
              SUM(numero_presenze) as totale_mese,
              AVG(numero_presenze) as media_giornaliera
            FROM presenze 
            WHERE data >= ? AND data <= ?`,
      args: [monthData.dates[0], monthData.dates[monthData.dates.length - 1]]
    });

    return res.status(200).json({
      success: true,
      statistiche: {
        per_fascia: statsResult.rows,
        totale_mese: totaleResult.rows[0]?.totale_mese || 0,
        media_giornaliera: parseFloat(totaleResult.rows[0]?.media_giornaliera || 0).toFixed(2),
        month_info: monthData
      }
    });

  } catch (error) {
    console.error('Errore nel recupero statistiche:', error);
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
    
    // Route per statistiche
    if (req.method === 'GET' && req.query.stats === 'true') {
      return await getStatistiche(req, res);
    }
    
    switch (req.method) {
      case 'GET':
        return await getPresenze(req, res);
      case 'POST':
        return await aggiornaPresenze(req, res);
      case 'DELETE':
        return await eliminaPresenza(req, res);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Metodo non supportato' 
        });
    }
  } catch (error) {
    console.error('Errore API presenze:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Errore interno del server'
    });
  }
}