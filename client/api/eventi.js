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

// Funzione per validare il formato base64 dell'immagine
function validateBase64Image(base64String) {
  if (!base64String) return true; // Opzionale
  
  // Verifica che sia un data URL valido per immagini
  const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
  return base64Regex.test(base64String);
}

// Funzione per convertire blob in base64 per la risposta
function blobToBase64(blob) {
  if (!blob) return null;
  
  // Se è già una stringa base64, restituiscila
  if (typeof blob === 'string' && blob.startsWith('data:image/')) {
    return blob;
  }
  
  // Se è un Buffer, convertilo
  if (Buffer.isBuffer(blob)) {
    return `data:image/jpeg;base64,${blob.toString('base64')}`;
  }
  
  return null;
}

// Funzione per validare email
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ========== SISTEMA EMAIL INTEGRATO ==========

// Funzione per inviare email di conferma con Web3Forms (più semplice)
async function sendConfirmationEmail(prenotazione, evento) {
  if (!process.env.WEB3FORMS_ACCESS_KEY) {
    console.log('WEB3FORMS_ACCESS_KEY non configurato, email non inviata');
    return false;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Conferma Prenotazione</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .email-container {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid rgb(12, 73, 91);
        }
        .logo {
          font-size: 2rem;
          font-weight: bold;
          color: rgb(12, 73, 91);
          margin-bottom: 10px;
        }
        .success-icon {
          font-size: 3rem;
          margin-bottom: 15px;
        }
        .title {
          color: rgb(12, 73, 91);
          font-size: 1.8rem;
          margin-bottom: 10px;
        }
        .subtitle {
          color: #666;
          font-size: 1.1rem;
        }
        .event-card {
          background: linear-gradient(135deg, rgb(12, 73, 91) 0%, rgba(12, 73, 91, 0.9) 100%);
          color: white;
          padding: 25px;
          border-radius: 12px;
          margin: 25px 0;
        }
        .event-title {
          font-size: 1.4rem;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .event-detail {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          font-size: 1rem;
        }
        .event-detail-icon {
          margin-right: 12px;
          width: 24px;
          font-size: 1.2rem;
        }
        .booking-details {
          background: #f8f9fa;
          padding: 25px;
          border-radius: 10px;
          margin: 25px 0;
          border: 1px solid #e9ecef;
        }
        .booking-details h3 {
          color: rgb(12, 73, 91);
          margin-bottom: 20px;
          font-size: 1.3rem;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #495057;
          font-size: 1rem;
        }
        .detail-value {
          color: #212529;
          font-size: 1rem;
          text-align: right;
        }
        .highlight {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #2196F3;
        }
        .contact-info {
          background: #e8f5e9;
          padding: 20px;
          border-radius: 10px;
          margin-top: 25px;
          text-align: center;
          border: 1px solid #c8e6c9;
        }
        .contact-info h3 {
          color: #2e7d32;
          margin-top: 0;
          font-size: 1.2rem;
        }
        .notes {
          background: #fff3e0;
          border: 1px solid #ffcc02;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        }
        .notes strong {
          color: #ef6c00;
        }
        .footer {
          text-align: center;
          margin-top: 35px;
          padding-top: 25px;
          border-top: 2px solid #e9ecef;
          color: #666;
          font-size: 0.9rem;
        }
        @media (max-width: 600px) {
          body { padding: 10px; }
          .email-container { padding: 20px; }
          .event-card { padding: 20px; }
          .booking-details { padding: 20px; }
          .detail-row { flex-direction: column; align-items: flex-start; gap: 5px; }
          .detail-value { text-align: left; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">🎓 Aula Studio Foro</div>
          <div class="success-icon">✅</div>
          <h1 class="title">Prenotazione Confermata!</h1>
          <p class="subtitle">La tua prenotazione è stata registrata con successo</p>
        </div>
        
        <div class="highlight">
          <strong>🎉 Perfetto!</strong> Hai prenotato il tuo posto per l'evento. 
          Ti aspettiamo presso la nostra sede!
        </div>
        
        <div class="event-card">
          <h2 class="event-title">📚 ${evento.titolo}</h2>
          <div class="event-detail">
            <span class="event-detail-icon">📅</span>
            <span><strong>${new Date(evento.data_evento).toLocaleDateString('it-IT', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</strong></span>
          </div>
          <div class="event-detail">
            <span class="event-detail-icon">📍</span>
            <span>Aula Studio Foro - Via Roma, Piossasco (TO)</span>
          </div>
          <div class="event-detail">
            <span class="event-detail-icon">👥</span>
            <span>${prenotazione.num_partecipanti} ${prenotazione.num_partecipanti === 1 ? 'partecipante' : 'partecipanti'}</span>
          </div>
          ${evento.descrizione ? `
          <div class="event-detail">
            <span class="event-detail-icon">📝</span>
            <span>${evento.descrizione}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="booking-details">
          <h3>📋 I tuoi dati di prenotazione</h3>
          <div class="detail-row">
            <span class="detail-label">👤 Nome completo:</span>
            <span class="detail-value"><strong>${prenotazione.nome} ${prenotazione.cognome}</strong></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📧 Email:</span>
            <span class="detail-value">${prenotazione.email}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🎫 Partecipanti:</span>
            <span class="detail-value"><strong>${prenotazione.num_partecipanti}</strong></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕐 Prenotazione effettuata:</span>
            <span class="detail-value">${new Date(prenotazione.data_prenotazione).toLocaleDateString('it-IT')} alle ${new Date(prenotazione.data_prenotazione).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          ${prenotazione.note ? `
          <div class="detail-row">
            <span class="detail-label">📝 Note:</span>
            <span class="detail-value">${prenotazione.note}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="contact-info">
          <h3>📞 Hai bisogno di aiuto?</h3>
          <p>Se hai domande, devi fare modifiche o hai problemi:</p>
          <p>
            <strong>📧 Email:</strong> info@aulastudioforo.it<br>
            <strong>📱 Telefono:</strong> +39 011 123 4567<br>
            <strong>🌐 Sito web:</strong> www.aulastudioforo.it
          </p>
        </div>
        
        <div class="footer">
          <p><strong>🏛️ Associazione Foro - Aula Studio</strong></p>
          <p>📍 Via Roma, 123 - 10045 Piossasco (TO)</p>
          <p>🌐 www.aulastudioforo.it | 📧 info@aulastudioforo.it</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 0.8rem; color: #999;">
            Questa email è stata generata automaticamente dal sistema di prenotazioni.<br>
            Non rispondere direttamente a questo messaggio.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        access_key: process.env.WEB3FORMS_ACCESS_KEY,
        subject: `✅ Conferma prenotazione: ${evento.titolo}`,
        email: prenotazione.email,
        name: `${prenotazione.nome} ${prenotazione.cognome}`,
        message: htmlContent,
        from_name: "Aula Studio Foro",
        replyto: "info@aulastudioforo.it"
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Email di conferma inviata con successo:', result);
      return true;
    } else {
      console.error('Errore nell\'invio dell\'email:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    return false;
  }
}

// ========== HANDLER PRINCIPALE ==========

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
          SELECT id, titolo, descrizione, data_evento, immagine_url, 
                 immagine_blob, immagine_tipo, immagine_nome
          FROM eventi 
          ORDER BY data_evento ASC
        `);
        
        const eventiConverted = convertBigIntToNumber(eventiResult.rows).map(evento => ({
          ...evento,
          immagine_blob: blobToBase64(evento.immagine_blob)
        }));
        
        return res.status(200).json({
          success: true,
          eventi: eventiConverted
        });
      }
      
      // GET singolo evento con prenotazioni
      if (action === 'single' && id) {
        console.log('Getting single evento:', id);
        
        const eventoResult = await client.execute({
          sql: `SELECT id, titolo, descrizione, data_evento, immagine_url, 
                       immagine_blob, immagine_tipo, immagine_nome
                FROM eventi WHERE id = ?`,
          args: [id]
        });

        if (!eventoResult.rows.length) {
          return res.status(404).json({
            success: false,
            error: 'Evento non trovato'
          });
        }

        const prenotazioniResult = await client.execute({
          sql: 'SELECT * FROM prenotazioni_eventi WHERE evento_id = ? ORDER BY data_prenotazione DESC',
          args: [id]
        });

        const eventoConverted = convertBigIntToNumber(eventoResult.rows[0]);
        eventoConverted.immagine_blob = blobToBase64(eventoConverted.immagine_blob);
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

      // ========== GESTIONE PRENOTAZIONI ==========
      
      // GET tutte le prenotazioni o per evento specifico
      if (section === 'prenotazioni' && !evento_id) {
        console.log('Getting all prenotazioni');
        
        const prenotazioniResult = await client.execute(`
          SELECT p.*, e.titolo as evento_titolo, e.data_evento
          FROM prenotazioni_eventi p
          LEFT JOIN eventi e ON p.evento_id = e.id
          ORDER BY p.data_prenotazione DESC
        `);

        const prenotazioniConverted = convertBigIntToNumber(prenotazioniResult.rows);

        return res.status(200).json({
          success: true,
          prenotazioni: prenotazioniConverted
        });
      }
    }

    if (req.method === 'POST') {
      // ========== CREAZIONE PRENOTAZIONE ==========
      if (section === 'prenotazioni') {
        const { 
          evento_id, 
          nome, 
          cognome, 
          email, 
          num_biglietti, 
          note, 
          data_prenotazione 
        } = req.body;
        
        console.log('Creating prenotazione:', { 
          evento_id, 
          nome, 
          cognome, 
          email, 
          num_biglietti, 
          note: note ? 'present' : 'empty'
        });

        // Validazione campi obbligatori
        if (!evento_id || !nome || !cognome || !email) {
          return res.status(400).json({
            success: false,
            error: 'Evento ID, nome, cognome e email sono richiesti'
          });
        }

        // Validazione email
        if (!validateEmail(email)) {
          return res.status(400).json({
            success: false,
            error: 'Formato email non valido'
          });
        }

        // Validazione numero biglietti
        const numPartecipanti = num_biglietti || 1;
        if (numPartecipanti < 1 || numPartecipanti > 10) {
          return res.status(400).json({
            success: false,
            error: 'Il numero di partecipanti deve essere tra 1 e 10'
          });
        }

        // Verifica che l'evento esista
        const eventoResult = await client.execute({
          sql: 'SELECT * FROM eventi WHERE id = ?',
          args: [evento_id]
        });

        if (!eventoResult.rows.length) {
          return res.status(404).json({
            success: false,
            error: 'Evento non trovato'
          });
        }

        const evento = convertBigIntToNumber(eventoResult.rows[0]);
        evento.immagine_blob = blobToBase64(evento.immagine_blob);

        // Verifica che l'evento non sia già passato
        const eventoDate = new Date(evento.data_evento);
        const now = new Date();
        if (eventoDate < now) {
          return res.status(400).json({
            success: false,
            error: 'Non è possibile prenotarsi per eventi già passati'
          });
        }

        // Verifica se l'utente ha già una prenotazione per questo evento
        const esistenteResult = await client.execute({
          sql: 'SELECT id FROM prenotazioni_eventi WHERE evento_id = ? AND email = ?',
          args: [evento_id, email.toLowerCase()]
        });

        if (esistenteResult.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Hai già una prenotazione per questo evento'
          });
        }

        // Crea la prenotazione
        const dataPrenotazione = data_prenotazione || new Date().toISOString();
        
        const result = await client.execute({
          sql: `INSERT INTO prenotazioni_eventi 
                (evento_id, nome, cognome, email, num_partecipanti, note, data_prenotazione) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            evento_id,
            nome.trim(),
            cognome.trim(),
            email.toLowerCase().trim(),
            numPartecipanti,
            note?.trim() || '',
            dataPrenotazione
          ]
        });

        if (result.rowsAffected > 0) {
          const prenotazioneId = convertBigIntToNumber(result.lastInsertRowid);
          
          // Prepara i dati della prenotazione per l'email
          const prenotazioneData = {
            id: prenotazioneId,
            evento_id,
            nome: nome.trim(),
            cognome: cognome.trim(),
            email: email.toLowerCase().trim(),
            num_partecipanti: numPartecipanti,
            note: note?.trim() || '',
            data_prenotazione: dataPrenotazione
          };

          // Invia email di conferma (in modo asincrono per non bloccare la risposta)
          let emailSent = false;
          try {
            emailSent = await sendConfirmationEmail(prenotazioneData, evento);
          } catch (emailError) {
            console.error('Errore nell\'invio email:', emailError);
          }

          return res.status(201).json({
            success: true,
            message: 'Prenotazione creata con successo',
            prenotazione_id: prenotazioneId,
            email_sent: emailSent,
            created_at: dataPrenotazione
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Errore nella creazione della prenotazione'
          });
        }
      }

      // ========== CREAZIONE EVENTO ==========
      else {
        const { 
          titolo, 
          descrizione, 
          data_evento, 
          immagine_url, 
          immagine_blob, 
          immagine_tipo, 
          immagine_nome, 
          user_id 
        } = req.body;
        
        console.log('Creating evento:', { 
          titolo, 
          descrizione, 
          data_evento, 
          immagine_url: immagine_url ? 'present' : 'empty',
          immagine_blob: immagine_blob ? 'present' : 'empty',
          immagine_tipo, 
          immagine_nome, 
          user_id 
        });

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

        // Valida immagine base64 se presente
        if (immagine_blob && !validateBase64Image(immagine_blob)) {
          return res.status(400).json({
            success: false,
            error: 'Formato immagine non valido'
          });
        }

        // Prepara il blob per il salvataggio (converte da base64 a Buffer se necessario)
        let blobToSave = null;
        if (immagine_blob) {
          try {
            // Rimuovi il prefisso data:image/...;base64, se presente
            const base64Data = immagine_blob.replace(/^data:image\/[a-z]+;base64,/, '');
            blobToSave = Buffer.from(base64Data, 'base64');
          } catch (error) {
            console.error('Error converting base64 to buffer:', error);
            return res.status(400).json({
              success: false,
              error: 'Errore nella conversione dell\'immagine'
            });
          }
        }

        const result = await client.execute({
          sql: `INSERT INTO eventi 
                (titolo, descrizione, data_evento, immagine_url, immagine_blob, immagine_tipo, immagine_nome) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            titolo,
            descrizione || '',
            data_evento,
            immagine_url || '',
            blobToSave,
            immagine_tipo || '',
            immagine_nome || ''
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
    }

    if (req.method === 'PUT') {
      const { 
        id, 
        titolo, 
        descrizione, 
        data_evento, 
        immagine_url, 
        immagine_blob, 
        immagine_tipo, 
        immagine_nome, 
        user_id 
      } = req.body;
      
      console.log('Updating evento:', { 
        id, 
        titolo, 
        descrizione, 
        data_evento, 
        immagine_url: immagine_url ? 'present' : 'empty',
        immagine_blob: immagine_blob ? 'present' : 'empty',
        immagine_tipo, 
        immagine_nome, 
        user_id 
      });

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

      // Valida immagine base64 se presente
      if (immagine_blob && !validateBase64Image(immagine_blob)) {
        return res.status(400).json({
          success: false,
          error: 'Formato immagine non valido'
        });
      }

      // Prepara il blob per il salvataggio
      let blobToSave = null;
      let shouldUpdateBlob = false;
      
      if (immagine_blob) {
        shouldUpdateBlob = true;
        try {
          const base64Data = immagine_blob.replace(/^data:image\/[a-z]+;base64,/, '');
          blobToSave = Buffer.from(base64Data, 'base64');
        } catch (error) {
          console.error('Error converting base64 to buffer:', error);
          return res.status(400).json({
            success: false,
            error: 'Errore nella conversione dell\'immagine'
          });
        }
      }

      // Query di aggiornamento dinamica
      let sql, args;
      
      if (shouldUpdateBlob) {
        sql = `UPDATE eventi 
               SET titolo = ?, descrizione = ?, data_evento = ?, immagine_url = ?, 
                   immagine_blob = ?, immagine_tipo = ?, immagine_nome = ?
               WHERE id = ?`;
        args = [
          titolo,
          descrizione || '',
          data_evento,
          immagine_url || '',
          blobToSave,
          immagine_tipo || '',
          immagine_nome || '',
          id
        ];
      } else {
        sql = `UPDATE eventi 
               SET titolo = ?, descrizione = ?, data_evento = ?, immagine_url = ?
               WHERE id = ?`;
        args = [
          titolo,
          descrizione || '',
          data_evento,
          immagine_url || '',
          id
        ];
      }

      const result = await client.execute({
        sql: sql,
        args: args
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

        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'ID prenotazione richiesto'
          });
        }

        // Verifica che la prenotazione esista
        const prenotazioneExists = await client.execute({
          sql: 'SELECT id FROM prenotazioni_eventi WHERE id = ?',
          args: [id]
        });

        if (!prenotazioneExists.rows.length) {
          return res.status(404).json({
            success: false,
            error: 'Prenotazione non trovata'
          });
        }

        // Elimina la prenotazione
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
          return res.status(400).json({
            success: false,
            error: 'Errore nell\'eliminazione della prenotazione'
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

        // Elimina prima le prenotazioni associate (CASCADE)
        await client.execute({
          sql: 'DELETE FROM prenotazioni_eventi WHERE evento_id = ?',
          args: [id]
        });

        // Poi elimina l'evento
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