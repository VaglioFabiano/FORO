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

// Funzione per ottenere i giorni della settimana corrente
function getCurrentWeekDates() {
  const now = new Date();
  const currentDay = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date.toISOString().split('T')[0]);
  }
  return weekDates;
}

// Funzione per ottenere i giorni della prossima settimana
function getNextWeekDates() {
  const now = new Date();
  const currentDay = now.getDay();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + 7);
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(nextMonday);
    date.setDate(nextMonday.getDate() + i);
    weekDates.push(date.toISOString().split('T')[0]);
  }
  return weekDates;
}

// Funzione per convertire nome giorno in numero
function getDayNumber(dayName) {
  const days = {
    'lunedì': 0, 'martedì': 1, 'mercoledì': 2, 'giovedì': 3,
    'venerdì': 4, 'sabato': 5, 'domenica': 6
  };
  return days[dayName.toLowerCase()];
}

// Funzione per generare turni in base alle fasce orarie
function generateTurniFromFasce(fasce, weekDates) {
  const turni = [];
  const turniTemplate = [
    { inizio: '09:00', fine: '13:00' },
    { inizio: '13:00', fine: '16:00' },
    { inizio: '16:00', fine: '19:30' }
  ];

  weekDates.forEach((data, dayIndex) => {
    // Trova le fasce orarie per questo giorno
    const dayName = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'][dayIndex];
    const fascheGiorno = fasce.filter(f => f.giorno === dayName);
    
    if (fascheGiorno.length === 0) return; // Giorno chiuso

    // Trova l'orario di chiusura massimo
    const maxChiusura = Math.max(...fascheGiorno.map(f => {
      const [ore, minuti] = f.ora_fine.split(':').map(Number);
      return ore * 60 + minuti;
    }));

    turniTemplate.forEach((turno, turnoIndex) => {
      const [oreInizio, minutiInizio] = turno.inizio.split(':').map(Number);
      const [oreFine, minutiFine] = turno.fine.split(':').map(Number);
      const inizioMinuti = oreInizio * 60 + minutiInizio;
      const fineMinuti = oreFine * 60 + minutiFine;

      // Se il turno inizia dopo l'orario di chiusura, saltalo
      if (inizioMinuti >= maxChiusura) return;

      // Se il turno finirebbe dopo l'orario di chiusura, accorcialo
      let turnoFine = turno.fine;
      if (fineMinuti > maxChiusura) {
        const ore = Math.floor(maxChiusura / 60);
        const minuti = maxChiusura % 60;
        turnoFine = `${ore.toString().padStart(2, '0')}:${minuti.toString().padStart(2, '0')}`;
      }

      turni.push({
        data,
        turno_inizio: turno.inizio,
        turno_fine: turnoFine,
        fascia_id: fascheGiorno[0].id, // Usa la prima fascia del giorno come riferimento
        day_index: dayIndex,
        turno_index: turnoIndex
      });
    });
  });

  return turni;
}

// GET - Ottieni turni della settimana
async function getTurni(req, res) {
  try {
    const { settimana } = req.query; // 'corrente' o 'prossima'
    
    // Ottieni fasce orarie
    let fascheQuery = 'SELECT id, giorno, ora_inizio, ora_fine, note FROM fasce_orarie';
    if (settimana === 'prossima') {
      fascheQuery = 'SELECT id, giorno, ora_inizio, ora_fine, note FROM fasce_orarie_prossima';
    }
    
    const fascheResult = await client.execute(fascheQuery);
    const fasce = fascheResult.rows;

    // Ottieni date della settimana
    const weekDates = settimana === 'prossima' ? getNextWeekDates() : getCurrentWeekDates();
    
    // Genera turni possibili
    const turniPossibili = generateTurniFromFasce(fasce, weekDates);

    // Ottieni turni già assegnati
    const turniAssegnati = await client.execute({
      sql: `SELECT t.id, t.data, t.turno_inizio, t.turno_fine, t.fascia_id, t.user_id, t.note,
                   u.name, u.surname, u.username
            FROM turni t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.data >= ? AND t.data <= ?
            ORDER BY t.data, t.turno_inizio`,
      args: [weekDates[0], weekDates[6]]
    });

    // Combina turni possibili con quelli assegnati
    const turniCompleti = turniPossibili.map(turno => {
      const assegnato = turniAssegnati.rows.find(a => 
        a.data === turno.data && 
        a.turno_inizio === turno.turno_inizio && 
        a.turno_fine === turno.turno_fine
      );

      return {
        ...turno,
        id: assegnato?.id || null,
        user_id: assegnato?.user_id || null,
        note: assegnato?.note || '',
        user_name: assegnato?.name || '',
        user_surname: assegnato?.surname || '',
        user_username: assegnato?.username || '',
        assegnato: !!assegnato
      };
    });

    return res.status(200).json({
      success: true,
      turni: turniCompleti,
      settimana: settimana || 'corrente',
      date_range: { inizio: weekDates[0], fine: weekDates[6] }
    });

  } catch (error) {
    console.error('Errore nel recupero turni:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// POST - Assegna un turno
async function assegnaTurno(req, res) {
  try {
    const { data, turno_inizio, turno_fine, fascia_id, user_id, note } = req.body;

    if (!data || !turno_inizio || !turno_fine || !fascia_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Dati mancanti'
      });
    }

    // Verifica se esiste già un turno per questa combinazione
    const esistente = await client.execute({
      sql: 'SELECT id FROM turni WHERE data = ? AND turno_inizio = ? AND turno_fine = ?',
      args: [data, turno_inizio, turno_fine]
    });

    if (esistente.rows.length > 0) {
      // Aggiorna il turno esistente
      const result = await client.execute({
        sql: `UPDATE turni SET user_id = ?, note = ? WHERE data = ? AND turno_inizio = ? AND turno_fine = ?
              RETURNING id, data, turno_inizio, turno_fine, fascia_id, user_id, note`,
        args: [user_id, note || '', data, turno_inizio, turno_fine]
      });

      return res.status(200).json({
        success: true,
        turno: result.rows[0],
        action: 'updated'
      });
    } else {
      // Crea nuovo turno
      const result = await client.execute({
        sql: `INSERT INTO turni (data, turno_inizio, turno_fine, fascia_id, user_id, note)
              VALUES (?, ?, ?, ?, ?, ?)
              RETURNING id, data, turno_inizio, turno_fine, fascia_id, user_id, note`,
        args: [data, turno_inizio, turno_fine, fascia_id, user_id, note || '']
      });

      return res.status(201).json({
        success: true,
        turno: result.rows[0],
        action: 'created'
      });
    }

  } catch (error) {
    console.error('Errore nell\'assegnazione turno:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}

// DELETE - Rimuovi assegnazione turno
async function rimuoviTurno(req, res) {
  try {
    const { data, turno_inizio, turno_fine } = req.body;

    if (!data || !turno_inizio || !turno_fine) {
      return res.status(400).json({
        success: false,
        error: 'Dati mancanti'
      });
    }

    const result = await client.execute({
      sql: 'DELETE FROM turni WHERE data = ? AND turno_inizio = ? AND turno_fine = ?',
      args: [data, turno_inizio, turno_fine]
    });

    return res.status(200).json({
      success: true,
      deleted: result.rowsAffected > 0
    });

  } catch (error) {
    console.error('Errore nella rimozione turno:', error);
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
    
    switch (req.method) {
      case 'GET':
        return await getTurni(req, res);
      case 'POST':
        return await assegnaTurno(req, res);
      case 'DELETE':
        return await rimuoviTurno(req, res);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Metodo non supportato' 
        });
    }
  } catch (error) {
    console.error('Errore API turni:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Errore interno del server'
    });
  }
}