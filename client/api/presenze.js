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

// Funzione per ottenere dati di un mese specifico da stringa YYYY-MM
function getMonthDataFromString(monthString) {
  const [year, month] = monthString.split('-').map(Number);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthOffset = (year - currentYear) * 12 + (month - currentMonth);
  return getMonthDates(monthOffset);
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

// Funzione per generare PDF
async function generatePDF(presenzeData, monthsInfo) {
  try {
    // Header HTML per il PDF
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Report Presenze</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #8B4513;
            padding-bottom: 15px;
        }
        .month-section { 
            margin-bottom: 40px; 
            page-break-inside: avoid;
        }
        .month-title { 
            font-size: 18px; 
            font-weight: bold; 
            color: #8B4513; 
            margin-bottom: 15px;
            border-left: 4px solid #D2691E;
            padding-left: 10px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
            font-size: 12px;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: center; 
        }
        th { 
            background-color: #8B4513; 
            color: white; 
            font-weight: bold;
        }
        .weekend { 
            background-color: #fff3cd; 
        }
        .has-presenze { 
            background-color: #d4edda; 
            font-weight: bold;
        }
        .total-row { 
            background-color: #f8f9fa; 
            font-weight: bold; 
        }
        .stats { 
            margin-top: 15px; 
            padding: 10px; 
            background-color: #f8f9fa; 
            border-radius: 5px;
        }
        .stats-title { 
            font-weight: bold; 
            margin-bottom: 8px; 
            color: #8B4513;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Report Presenze</h1>
        <p>Generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}</p>
        <p>Periodo: ${monthsInfo.length} mesi selezionati</p>
    </div>
`;

    // Genera sezione per ogni mese
    for (const monthData of presenzeData) {
      const monthInfo = monthData.monthInfo;
      const presenze = monthData.presenze;
      
      html += `
    <div class="month-section">
        <div class="month-title">${monthInfo.monthName}</div>
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Giorno</th>
                    <th>9-13</th>
                    <th>13-16</th>
                    <th>16-19</th>
                    <th>21-24</th>
                    <th>Totale</th>
                </tr>
            </thead>
            <tbody>
`;

      // Organizza presenze per data
      const presenzeMap = {};
      presenze.forEach(p => {
        if (!presenzeMap[p.data]) {
          presenzeMap[p.data] = {};
        }
        presenzeMap[p.data][p.fascia_oraria] = p.numero_presenze;
      });

      // Genera righe per ogni giorno del mese
      monthInfo.dates.forEach(data => {
        const date = new Date(data);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        
        const totaleGiorno = FASCE_ORARIE.reduce((sum, fascia) => {
          return sum + (presenzeMap[data]?.[fascia] || 0);
        }, 0);

        html += `
                <tr class="${isWeekend ? 'weekend' : ''}">
                    <td>${date.getDate()}</td>
                    <td>${dayNames[dayOfWeek]}</td>
`;

        FASCE_ORARIE.forEach(fascia => {
          const numero = presenzeMap[data]?.[fascia] || 0;
          html += `                    <td class="${numero > 0 ? 'has-presenze' : ''}">${numero > 0 ? numero : '-'}</td>\n`;
        });

        html += `                    <td class="${totaleGiorno > 0 ? 'has-presenze' : ''}">${totaleGiorno > 0 ? totaleGiorno : '-'}</td>
                </tr>
`;
      });

      // Calcola totali per fascia e totale mese
      const totaliFascia = {};
      let totaleMese = 0;
      
      FASCE_ORARIE.forEach(fascia => {
        totaliFascia[fascia] = presenze
          .filter(p => p.fascia_oraria === fascia)
          .reduce((sum, p) => sum + p.numero_presenze, 0);
        totaleMese += totaliFascia[fascia];
      });

      html += `
                <tr class="total-row">
                    <td colspan="2"><strong>TOTALI MESE</strong></td>
`;

      FASCE_ORARIE.forEach(fascia => {
        html += `                    <td><strong>${totaliFascia[fascia]}</strong></td>\n`;
      });

      html += `                    <td><strong>${totaleMese}</strong></td>
                </tr>
            </tbody>
        </table>
        
        <div class="stats">
            <div class="stats-title">Statistiche ${monthInfo.monthName}</div>
            <p><strong>Totale mese:</strong> ${totaleMese} presenze</p>
            <p><strong>Media giornaliera:</strong> ${(totaleMese / monthInfo.dates.length).toFixed(2)} presenze/giorno</p>
            <p><strong>Giorni con presenze:</strong> ${Object.keys(presenzeMap).filter(data => 
              FASCE_ORARIE.some(fascia => (presenzeMap[data]?.[fascia] || 0) > 0)
            ).length} su ${monthInfo.dates.length}</p>
        </div>
    </div>
`;
    }

    html += `
</body>
</html>`;

    return html;
  } catch (error) {
    console.error('Errore nella generazione del PDF:', error);
    throw error;
  }
}

// POST - Genera e scarica PDF
async function downloadPDF(req, res) {
  try {
    const { months, user_id } = req.body;

    if (!months || !Array.isArray(months) || months.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lista mesi mancante o vuota'
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
        error: 'Non hai i permessi per scaricare il PDF'
      });
    }

    // Raccoglie dati per tutti i mesi richiesti
    const presenzeData = [];
    
    for (const monthString of months) {
      try {
        const monthInfo = getMonthDataFromString(monthString);
        
        // Ottieni presenze per questo mese
        const presenzeResult = await client.execute({
          sql: `SELECT data, fascia_oraria, numero_presenze, note
                FROM presenze
                WHERE data >= ? AND data <= ?
                ORDER BY data, fascia_oraria`,
          args: [monthInfo.dates[0], monthInfo.dates[monthInfo.dates.length - 1]]
        });

        presenzeData.push({
          monthInfo: monthInfo,
          presenze: presenzeResult.rows
        });
      } catch (error) {
        console.error(`Errore nel recupero dati per il mese ${monthString}:`, error);
      }
    }

    if (presenzeData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nessun dato trovato per i mesi selezionati'
      });
    }

    // Genera HTML per PDF
    const htmlContent = await generatePDF(presenzeData, months);
    
    // Per un ambiente Node.js, dovresti usare puppeteer o una libreria simile
    // Per ora restituisco l'HTML che può essere convertito lato client
    // In una implementazione completa useresti:
    // const puppeteer = require('puppeteer');
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.setContent(htmlContent);
    // const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
    // await browser.close();
    
    // Per ora, restituisco una risposta che simula il PDF
    // In produzione sostituiresti questo con il buffer del PDF reale
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="presenze_report_${months.length}_mesi.pdf"`);
    
    // Placeholder - in produzione qui andrà il PDF buffer
    return res.status(200).json({
      success: true,
      message: 'PDF generato con successo',
      html: htmlContent, // Rimosso in produzione
      months_processed: presenzeData.length
    });

  } catch (error) {
    console.error('Errore nella generazione PDF:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server nella generazione PDF'
    });
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
      monthData = getMonthDataFromString(mese);
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
    
    // Route per PDF download
    if (req.method === 'POST' && req.url?.includes('download-pdf')) {
      return await downloadPDF(req, res);
    }
    
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