import { createClient } from '@libsql/client/web';

// Configurazione database (stesso del tuo file esistente)
const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim()
};

if (!config.url || !config.authToken) {
  console.error("Mancano le variabili d'ambiente per il DB!");
  throw new Error("Configurazione database mancante");
}

const client = createClient(config);

// Token bot Telegram
const TELEGRAM_BOT_TOKEN = '7608037480:AAGkJbIf02G98dTEnREBhfjI2yna5-Y1pzc';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

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

// Funzione per ottenere il nome del giorno dalla data
function getDayNameFromDate(dateString) {
  const date = new Date(dateString);
  const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return giorni[date.getDay()];
}

// Funzione per formattare la data per i messaggi
function formatDateForMessage(dateString) {
  const date = new Date(dateString);
  const dayName = getDayNameFromDate(dateString);
  return `${dayName} ${date.getDate()}/${date.getMonth() + 1}`;
}

// Funzione per inviare messaggio Telegram
async function sendTelegramMessage(chatId, message) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.description || 'Errore nell\'invio del messaggio');
    }
    
    return data.result;
  } catch (error) {
    console.error('Errore invio messaggio Telegram:', error);
    throw error;
  }
}

// Funzione per ottenere il chat_id di un utente dal database
async function getUserTelegramChatId(userId) {
  try {
    const result = await client.execute({
      sql: `SELECT telegram_chat_id FROM users WHERE id = ? AND telegram_chat_id IS NOT NULL`,
      args: [userId]
    });
    
    return result.rows.length > 0 ? result.rows[0].telegram_chat_id : null;
  } catch (error) {
    console.error('Errore nel recupero chat_id:', error);
    return null;
  }
}

// Funzione per ottenere informazioni utente dal database
async function getUserInfo(userId) {
  try {
    const result = await client.execute({
      sql: `SELECT name, surname, username FROM users WHERE id = ?`,
      args: [userId]
    });
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Errore nel recupero info utente:', error);
    return null;
  }
}

// Funzione per inviare notifica Telegram
async function sendTurnoNotification(action, turnoData, currentUserId, targetUserId = null) {
  try {
    // Determina chi deve ricevere la notifica
    let recipientUserId = null;
    let message = '';
    
    // Ottieni informazioni sugli utenti coinvolti
    const currentUserInfo = await getUserInfo(currentUserId);
    const targetUserInfo = targetUserId ? await getUserInfo(targetUserId) : null;
    
    if (!currentUserInfo) {
      console.error('Informazioni utente corrente non trovate');
      return;
    }
    
    // Formatta data e orario per il messaggio
    const dayAndDate = formatDateForMessage(turnoData.data);
    const orario = `${turnoData.turno_inizio}-${turnoData.turno_fine}`;
    
    switch (action) {
      case 'self_assigned':
        // L'utente si è assegnato un turno
        recipientUserId = currentUserId;
        message = `✅ Ti sei aggiunto al turno di ${dayAndDate} delle ${orario}`;
        break;
        
      case 'assigned':
        // Un admin ha assegnato un turno a qualcuno
        if (targetUserId && targetUserId !== currentUserId) {
          recipientUserId = targetUserId;
          message = `📋 ${currentUserInfo.name} ${currentUserInfo.surname} ti ha aggiunto al turno di ${dayAndDate} delle ${orario}`;
        }
        break;
        
      case 'self_removed':
        // L'utente si è rimosso da un turno
        recipientUserId = currentUserId;
        message = `❌ Ti sei rimosso dal turno di ${dayAndDate} delle ${orario}`;
        break;
        
      case 'removed':
        // Un admin ha rimosso qualcuno da un turno
        if (targetUserId && targetUserId !== currentUserId) {
          recipientUserId = targetUserId;
          message = `🗑️ ${currentUserInfo.name} ${currentUserInfo.surname} ti ha rimosso dal turno di ${dayAndDate} delle ${orario}`;
        }
        break;
        
      case 'closed_assigned':
        // Utente si è assegnato a un turno chiuso (straordinario)
        recipientUserId = currentUserId;
        message = `⚠️ Ti sei aggiunto al turno straordinario di ${dayAndDate} delle ${orario}`;
        break;
        
      default:
        console.log('Azione non riconosciuta per notifica:', action);
        return;
    }
    
    // Se non c'è un destinatario, non inviare nulla
    if (!recipientUserId || !message) {
      console.log('Nessuna notifica da inviare per questa azione');
      return;
    }
    
    // Ottieni il chat_id del destinatario
    const chatId = await getUserTelegramChatId(recipientUserId);
    
    if (!chatId) {
      console.log(`Chat ID non trovato per l'utente ${recipientUserId}, notifica non inviata`);
      return;
    }
    
    // Invia il messaggio
    await sendTelegramMessage(chatId, message);
    console.log(`Notifica inviata con successo a utente ${recipientUserId}: ${message}`);
    
    // Log della notifica nel database (opzionale)
    await client.execute({
      sql: `INSERT INTO telegram_messages (user_id, phone_number, message, success, created_at)
            VALUES (?, '', ?, 1, datetime('now'))`,
      args: [recipientUserId, message]
    }).catch(error => {
      console.error('Errore nel logging notifica:', error);
    });
    
  } catch (error) {
    console.error('Errore nell\'invio notifica turno:', error);
  }
}

// Handler per ripercussioni turni straordinari
async function handleClosedTurnoRepercussions(turnoData, userId, note) {
  console.log('Gestione ripercussioni turno straordinario', {
    turnoData,
    userId,
    note,
    timestamp: new Date().toISOString()
  });
  
  // TODO: Implementare logiche aggiuntive per turni straordinari
  // - Invio email a manager
  // - Notifica su Slack
  // - Log speciale
  // - Richiesta approvazione
  // - Calcolo costi extra
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

      const fasciaCompatibile = fasce.find(fascia => {
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

    // Gestione ripercussioni turno chiuso
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
    let turnoResult;
    
    if (esistente.rows.length > 0) {
      const oldUserId = esistente.rows[0].user_id;
      
      // Determina il tipo di azione per le notifiche
      if (current_user_id === user_id && current_user_id === oldUserId) {
        action = 'self_modified'; // Utente modifica le proprie note - nessuna notifica
      } else if (current_user_id === user_id) {
        action = is_closed_override ? 'closed_assigned' : 'self_assigned';
      } else if (oldUserId !== user_id) {
        action = 'assigned'; // Admin riassegna turno
      }

      // Aggiorna il turno esistente
      const result = await client.execute({
        sql: `UPDATE turni SET user_id = ?, note = ?, fascia_id = ? WHERE data = ? AND turno_inizio = ? AND turno_fine = ?
              RETURNING id, data, turno_inizio, turno_fine, fascia_id, user_id, note`,
        args: [user_id, note || '', fascia_id || 1, data, turno_inizio, turno_fine]
      });

      turnoResult = result.rows[0];

      // Invia notifica solo se non è una modifica delle proprie note
      if (action !== 'self_modified') {
        await sendTurnoNotification(action, turnoResult, current_user_id, targetUserId);
      }

      return res.status(200).json({
        success: true,
        turno: turnoResult,
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

      turnoResult = result.rows[0];

      // Invia notifica
      await sendTurnoNotification(action, turnoResult, current_user_id, targetUserId);

      return res.status(201).json({
        success: true,
        turno: turnoResult,
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

      // Invia notifica se il turno è stato effettivamente rimosso
      if (result.rowsAffected > 0) {
        await sendTurnoNotification(action, {
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