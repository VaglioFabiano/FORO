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

// Funzione per ottenere i giorni di una settimana specifica
function getWeekDates(weekOffset = 0) {
  const now = new Date();
  const currentDay = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + (weekOffset * 7));
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date.toISOString().split('T')[0]);
  }
  return weekDates;
}

// Funzione per ottenere i giorni della settimana corrente
function getCurrentWeekDates() {
  return getWeekDates(0);
}

// Funzione per ottenere i giorni della prossima settimana
function getNextWeekDates() {
  return getWeekDates(1);
}

// Funzione per ottenere i giorni della settimana +2
function getWeekPlus2Dates() {
  return getWeekDates(2);
}

// Funzione per ottenere i giorni della settimana +3
function getWeekPlus3Dates() {
  return getWeekDates(3);
}

// Funzione per convertire nome giorno in numero
function getDayNumber(dayName) {
  const days = {
    'lunedì': 0, 'martedì': 1, 'mercoledì': 2, 'giovedì': 3,
    'venerdì': 4, 'sabato': 5, 'domenica': 6
  };
  return days[dayName.toLowerCase()];
}

// Funzione per generare turni di default per settimane future
function generateDefaultTurni(weekDates) {
  const turni = [];
  const turniTemplate = [
    { inizio: '09:00', fine: '13:00', disponibile: true },
    { inizio: '13:00', fine: '16:00', disponibile: true },
    { inizio: '16:00', fine: '19:30', disponibile: true },
    { inizio: '21:00', fine: '24:00', disponibile: false } // Chiuso di default
  ];

  weekDates.forEach((data, dayIndex) => {
    turniTemplate.forEach((turno, turnoIndex) => {
      // Lunedì-Venerdì: primi 3 turni aperti, 4° chiuso
      // Sabato-Domenica: tutti chiusi
      const isWeekend = dayIndex === 5 || dayIndex === 6; // Sabato o Domenica
      const isAvailable = !isWeekend && turno.disponibile;

      if (isAvailable) {
        turni.push({
          data,
          turno_inizio: turno.inizio,
          turno_fine: turno.fine,
          fascia_id: 1, // ID di default, potresti volerlo parametrizzare
          day_index: dayIndex,
          turno_index: turnoIndex,
          nota_automatica: '',
          is_default: true
        });
      }
    });
  });

  return turni;
}

// Funzione per generare turni in base alle fasce orarie
function generateTurniFromFasce(fasce, weekDates, isDefaultWeek = false) {
  // Se è una settimana di default (settimana +2 o +3), usa turni di default
  if (isDefaultWeek) {
    return generateDefaultTurni(weekDates);
  }

  const turni = [];
  const turniTemplate = [
    { inizio: '09:00', fine: '13:00' },
    { inizio: '13:00', fine: '16:00' },
    { inizio: '16:00', fine: '19:30' },
    { inizio: '21:00', fine: '24:00' }
  ];

  weekDates.forEach((data, dayIndex) => {
    const dayName = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'][dayIndex];
    const fascheGiorno = fasce.filter(f => f.giorno === dayName);
    
    if (fascheGiorno.length === 0) return;

    turniTemplate.forEach((turno, turnoIndex) => {
      const [oreInizio, minutiInizio] = turno.inizio.split(':').map(Number);
      const [oreFine, minutiFine] = turno.fine.split(':').map(Number);
      const inizioMinuti = oreInizio * 60 + minutiInizio;
      let fineMinuti = oreFine * 60 + minutiFine;
      
      if (oreFine === 24) {
        fineMinuti = 24 * 60;
      }

      const fasciaCompatibile = fascheGiorno.find(fascia => {
        const [fasciaInizioOre, fasciaInizioMin] = fascia.ora_inizio.split(':').map(Number);
        const [fasciaFineOre, fasciaFineMin] = fascia.ora_fine.split(':').map(Number);
        const fasciaInizioMinuti = fasciaInizioOre * 60 + fasciaInizioMin;
        let fasciaFineMinuti = fasciaFineOre * 60 + fasciaFineMin;
        
        if (fasciaFineOre === 24 || (fasciaFineOre === 0 && fasciaFineMin === 0)) {
          fasciaFineMinuti = 24 * 60;
        }

        return fasciaInizioMinuti <= inizioMinuti && fasciaFineMinuti >= fineMinuti;
      });

      if (!fasciaCompatibile) {
        const fasciaConSovrapposizione = fascheGiorno.find(fascia => {
          const [fasciaInizioOre, fasciaInizioMin] = fascia.ora_inizio.split(':').map(Number);
          const [fasciaFineOre, fasciaFineMin] = fascia.ora_fine.split(':').map(Number);
          const fasciaInizioMinuti = fasciaInizioOre * 60 + fasciaInizioMin;
          let fasciaFineMinuti = fasciaFineOre * 60 + fasciaFineMin;
          
          if (fasciaFineOre === 24 || (fasciaFineOre === 0 && fasciaFineMin === 0)) {
            fasciaFineMinuti = 24 * 60;
          }

          return fasciaInizioMinuti < fineMinuti && fasciaFineMinuti > inizioMinuti;
        });

        if (fasciaConSovrapposizione) {
          const [fasciaInizioOre, fasciaInizioMin] = fasciaConSovrapposizione.ora_inizio.split(':').map(Number);
          const [fasciaFineOre, fasciaFineMin] = fasciaConSovrapposizione.ora_fine.split(':').map(Number);
          const fasciaInizioMinuti = fasciaInizioOre * 60 + fasciaInizioMin;
          let fasciaFineMinuti = fasciaFineOre * 60 + fasciaFineMin;
          
          if (fasciaFineOre === 24 || (fasciaFineOre === 0 && fasciaFineMin === 0)) {
            fasciaFineMinuti = 24 * 60;
          }

          const nuovoInizio = Math.max(inizioMinuti, fasciaInizioMinuti);
          const nuovaFine = Math.min(fineMinuti, fasciaFineMinuti);

          if (nuovaFine > nuovoInizio) {
            const nuovoInizioOre = Math.floor(nuovoInizio / 60);
            const nuovoInizioMin = nuovoInizio % 60;
            const nuovaFineOre = Math.floor(nuovaFine / 60);
            const nuovaFineMin = nuovaFine % 60;

            let turnoInizio = `${nuovoInizioOre.toString().padStart(2, '0')}:${nuovoInizioMin.toString().padStart(2, '0')}`;
            let turnoFine = `${nuovaFineOre.toString().padStart(2, '0')}:${nuovaFineMin.toString().padStart(2, '0')}`;
            
            if (nuovaFineOre === 24) {
              turnoFine = '24:00';
            }

            // Crea nota con orari specifici
            let nota = '';
            if (nuovoInizio > inizioMinuti) {
              nota = `(apertura posticipata alle ${turnoInizio})`;
            }
            if (nuovaFine < fineMinuti) {
              const chiusuraText = `(chiusura anticipata alle ${turnoFine})`;
              nota = nota ? nota + ' ' + chiusuraText : chiusuraText;
            }

            turni.push({
              data,
              turno_inizio: turnoInizio,
              turno_fine: turnoFine,
              fascia_id: fasciaConSovrapposizione.id,
              day_index: dayIndex,
              turno_index: turnoIndex,
              nota_automatica: nota
            });
          }
        }
        return;
      }

      let turnoFine = turno.fine;
      if (turno.fine === '24:00') {
        turnoFine = '24:00';
      }

      turni.push({
        data,
        turno_inizio: turno.inizio,
        turno_fine: turnoFine,
        fascia_id: fasciaCompatibile.id,
        day_index: dayIndex,
        turno_index: turnoIndex,
        nota_automatica: ''
      });
    });
  });

  return turni;
}

// Handler per notifiche (TODO)
async function handleTurnoNotification(action, turnoData, currentUserId, targetUserId = null) {
  // TODO: Implementare sistema di notifiche
  console.log('TODO: Notifica turno', {
    action, // 'assigned', 'removed', 'self_assigned', 'self_removed', 'closed_assigned'
    turnoData,
    currentUserId,
    targetUserId
  });
  
  /*
  Possibili azioni:
  - 'self_assigned': utente si assegna un turno
  - 'assigned': admin assegna turno a qualcuno
  - 'self_removed': utente si rimuove da un turno
  - 'removed': admin rimuove qualcuno da un turno
  - 'closed_assigned': utente si mette in turno chiuso (caso speciale)
  */
}

// Handler per ripercussioni turni straordinari (TODO)
async function handleClosedTurnoRepercussions(turnoData, userId, note) {
  // TODO: Implementare gestione ripercussioni
  console.log('TODO: Gestire ripercussioni turno straordinario', {
    turnoData,
    userId,
    note,
    timestamp: new Date().toISOString()
  });
  
  /*
  Possibili ripercussioni:
  - Invio email a manager
  - Notifica su Slack
  - Log speciale
  - Richiesta approvazione
  - Calcolo costi extra
  */
}

// GET - Ottieni turni della settimana
async function getTurni(req, res) {
  try {
    const { settimana } = req.query; // 'corrente', 'prossima', 'plus2', 'plus3'
    
    let weekDates;
    let isDefaultWeek = false;
    
    switch (settimana) {
      case 'prossima':
        weekDates = getNextWeekDates();
        break;
      case 'plus2':
        weekDates = getWeekPlus2Dates();
        isDefaultWeek = true;
        break;
      case 'plus3':
        weekDates = getWeekPlus3Dates();
        isDefaultWeek = true;
        break;
      default:
        weekDates = getCurrentWeekDates();
        break;
    }
    
    let turniPossibili = [];
    
    if (isDefaultWeek) {
      // Per settimane +2 e +3, usa turni di default
      turniPossibili = generateDefaultTurni(weekDates);
    } else {
      // Per settimana corrente e prossima, usa fasce orarie
      let fascheQuery = 'SELECT id, giorno, ora_inizio, ora_fine, note FROM fasce_orarie';
      if (settimana === 'prossima') {
        fascheQuery = 'SELECT id, giorno, ora_inizio, ora_fine, note FROM fasce_orarie_prossima';
      }
      
      const fascheResult = await client.execute(fascheQuery);
      const fasce = fascheResult.rows;
      turniPossibili = generateTurniFromFasce(fasce, weekDates);
    }

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
        user_id: assegnato?.user_id !== undefined ? assegnato.user_id : null,
        note: assegnato?.note || turno.nota_automatica || '',
        user_name: assegnato?.name || '',
        user_surname: assegnato?.surname || '',
        user_username: assegnato?.username || '',
        assegnato: !!assegnato,
        nota_automatica: turno.nota_automatica || '',
        is_default: turno.is_default || false
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
    const { data, turno_inizio, turno_fine, fascia_id, user_id, note, is_closed_override, current_user_id } = req.body;

    if (!data || !turno_inizio || !turno_fine || user_id === undefined || user_id === null) {
      return res.status(400).json({
        success: false,
        error: 'Dati mancanti'
      });
    }

    // TODO: Handler per ripercussioni turno chiuso
    if (is_closed_override) {
      await handleClosedTurnoRepercussions({
        data,
        turno_inizio,
        turno_fine
      }, user_id, note);
    }

    // Verifica se esiste già un turno per questa combinazione
    const esistente = await client.execute({
      sql: 'SELECT id, user_id FROM turni WHERE data = ? AND turno_inizio = ? AND turno_fine = ?',
      args: [data, turno_inizio, turno_fine]
    });

    let action = 'assigned';
    let targetUserId = user_id;
    
    if (esistente.rows.length > 0) {
      const oldUserId = esistente.rows[0].user_id;
      
      // Determina il tipo di azione per le notifiche
      if (current_user_id === user_id && current_user_id === oldUserId) {
        action = 'self_modified'; // Utente modifica le proprie note
      } else if (current_user_id === user_id) {
        action = is_closed_override ? 'closed_assigned' : 'self_assigned';
      } else if (current_user_id === oldUserId) {
        action = 'assigned'; // Admin assegna turno ad altri
      } else {
        action = 'assigned'; // Admin riassegna turno
      }

      // Aggiorna il turno esistente
      const result = await client.execute({
        sql: `UPDATE turni SET user_id = ?, note = ?, fascia_id = ? WHERE data = ? AND turno_inizio = ? AND turno_fine = ?
              RETURNING id, data, turno_inizio, turno_fine, fascia_id, user_id, note`,
        args: [user_id, note || '', fascia_id || 1, data, turno_inizio, turno_fine]
      });

      // TODO: Invia notifica
      await handleTurnoNotification(action, result.rows[0], current_user_id, targetUserId);

      return res.status(200).json({
        success: true,
        turno: result.rows[0],
        action: 'updated'
      });
    } else {
      // Determina il tipo di azione per nuovo turno
      if (current_user_id === user_id) {
        action = is_closed_override ? 'closed_assigned' : 'self_assigned';
      } else {
        action = 'assigned';
      }

      // Crea nuovo turno
      const result = await client.execute({
        sql: `INSERT INTO turni (data, turno_inizio, turno_fine, fascia_id, user_id, note)
              VALUES (?, ?, ?, ?, ?, ?)
              RETURNING id, data, turno_inizio, turno_fine, fascia_id, user_id, note`,
        args: [data, turno_inizio, turno_fine, fascia_id || 1, user_id, note || '']
      });

      // TODO: Invia notifica
      await handleTurnoNotification(action, result.rows[0], current_user_id, targetUserId);

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
    const { data, turno_inizio, turno_fine, current_user_id } = req.body;

    if (!data || !turno_inizio || !turno_fine) {
      return res.status(400).json({
        success: false,
        error: 'Dati mancanti'
      });
    }

    // Ottieni info del turno prima di rimuoverlo per le notifiche
    const turnoInfo = await client.execute({
      sql: 'SELECT user_id FROM turni WHERE data = ? AND turno_inizio = ? AND turno_fine = ?',
      args: [data, turno_inizio, turno_fine]
    });

    if (turnoInfo.rows.length > 0) {
      const removedUserId = turnoInfo.rows[0].user_id;
      
      // Determina il tipo di azione
      let action = 'removed';
      if (current_user_id === removedUserId) {
        action = 'self_removed';
      }

      const result = await client.execute({
        sql: 'DELETE FROM turni WHERE data = ? AND turno_inizio = ? AND turno_fine = ?',
        args: [data, turno_inizio, turno_fine]
      });

      // TODO: Invia notifica
      if (result.rowsAffected > 0) {
        await handleTurnoNotification(action, {
          data,
          turno_inizio,
          turno_fine
        }, current_user_id, removedUserId);
      }

      return res.status(200).json({
        success: true,
        deleted: result.rowsAffected > 0
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Turno non trovato'
      });
    }

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