import { createClient } from '@libsql/client/web';
import { Resend } from 'resend';

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

// Configurazione Resend
const resendApiKey = 're_WmxYBNKM_LPaMSt1JEMMLY5Ci7QPFx7Xp';
console.log('🔧 Configurazione Resend:', {
  api_key_presente: !!resendApiKey,
  api_key_length: resendApiKey ? resendApiKey.length : 0,
  api_key_prefix: resendApiKey ? resendApiKey.substring(0, 10) + '...' : 'mancante'
});

const resend = new Resend(resendApiKey);

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
  if (!base64String) return true;
  const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
  return base64Regex.test(base64String);
}

// Funzione per convertire blob in base64 per la risposta
function blobToBase64(blob) {
  if (!blob) return null;
  
  if (typeof blob === 'string' && blob.startsWith('data:image/')) {
    return blob;
  }
  
  if (Buffer.isBuffer(blob)) {
    return `data:image/jpeg;base64,${blob.toString('base64')}`;
  }
  
  return null;
}

// Funzione per validare email - MIGLIORATA
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  // Rimuovi spazi bianchi
  email = email.trim();
  
  // Controlli di base
  if (email.length === 0 || email.length > 320) return false;
  if (email.indexOf('@') === -1) return false;
  if (email.indexOf('@') !== email.lastIndexOf('@')) return false;
  
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [localPart, domainPart] = parts;
  
  // Controlli sulla parte locale (prima di @)
  if (localPart.length === 0 || localPart.length > 64) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.includes('..')) return false;
  
  // Controlli sul dominio
  if (domainPart.length === 0 || domainPart.length > 255) return false;
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) return false;
  if (domainPart.startsWith('-') || domainPart.endsWith('-')) return false;
  if (!domainPart.includes('.')) return false;
  
  // Regex più permissiva per caratteri validi
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email);
}

// ========== SISTEMA EMAIL CON RESEND ==========

// Funzione per creare un log strutturato
function logEmail(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'email-system',
    message,
    ...data
  };
  console.log(`[EMAIL-${level.toUpperCase()}] ${timestamp}: ${message}`, 
    Object.keys(data).length > 0 ? data : '');
}

// Funzione per creare il template email di conferma
function createEmailTemplate(prenotazione, evento) {
  return `
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
            <span>Aula Studio Foro - Via Alfieri, 4 - 10045 Piossasco (TO)</span>
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
            <strong>📧 Email:</strong> associazioneforopiossasco@gmail.com<br>
            <strong>📱 Telegram:</strong> https://t.me/aulastudioforo
          </p>
        </div>
        
        <div class="footer">
          <p><strong>🏛️ Associazione Foro - Aula Studio</strong></p>
          <p>📍 Via Alfieri, 4 - 10045 Piossasco (TO)</p>
          <p>📧 associazioneforopiossasco@gmail.com</p>
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
}

// Funzione per creare il template email broadcast
function createBroadcastEmailTemplate(prenotazione, evento, emailData) {
  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${emailData.subject}</title>
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
        .title {
          color: rgb(12, 73, 91);
          font-size: 1.8rem;
          margin-bottom: 10px;
        }
        .subtitle {
          color: #666;
          font-size: 1.1rem;
        }
        .greeting {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #2196F3;
        }
        .greeting h3 {
          color: rgb(12, 73, 91);
          margin-top: 0;
          margin-bottom: 10px;
        }
        .content-section {
          background: #f8f9fa;
          padding: 25px;
          border-radius: 10px;
          margin: 25px 0;
          border: 1px solid #e9ecef;
        }
        .content-section h3 {
          color: rgb(12, 73, 91);
          margin-bottom: 20px;
          font-size: 1.3rem;
        }
        .custom-message {
          color: #333;
          line-height: 1.7;
          font-size: 1.05rem;
          white-space: pre-line;
        }
        .event-reference {
          background: linear-gradient(135deg, rgb(12, 73, 91) 0%, rgba(12, 73, 91, 0.9) 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          margin: 25px 0;
          text-align: center;
        }
        .event-reference h4 {
          margin-top: 0;
          font-size: 1.2rem;
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
          .content-section { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">🎓 Aula Studio Foro</div>
          <h1 class="title">${emailData.subject}</h1>
          <p class="subtitle">Comunicazione per i partecipanti</p>
        </div>
        
        <div class="greeting">
          <h3>Ciao ${prenotazione.nome}! 👋</h3>
          <p>Ti scriviamo in merito alla tua prenotazione per l'evento <strong>"${evento.titolo}"</strong>.</p>
        </div>
        
        <div class="content-section">
          <h3>📋 Messaggio per te</h3>
          <div class="custom-message">${emailData.message}</div>
        </div>
        
        <div class="event-reference">
          <h4>📚 ${evento.titolo}</h4>
          <p>📅 ${new Date(evento.data_evento).toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p>📍 Via Alfieri, 4 - 10045 Piossasco (TO)</p>
        </div>
        
        <div class="contact-info">
          <h3>📞 Hai bisogno di aiuto?</h3>
          <p>Se hai domande o hai bisogno di chiarimenti:</p>
          <p>
            <strong>📧 Email:</strong> associazioneforopiossasco@gmail.com<br>
            <strong>📱 Telegram:</strong> https://t.me/aulastudioforo
          </p>
        </div>
        
        <div class="footer">
          <p><strong>🏛️ Associazione Foro - Aula Studio</strong></p>
          <p>📍 Via Alfieri, 4 - 10045 Piossasco (TO)</p>
          <p>📧 associazioneforopiossasco@gmail.com</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 0.8rem; color: #999;">
            Questa email è stata inviata a tutti i partecipanti dell'evento.<br>
            Per comunicazioni dirette, rispondi a questa email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Funzione per inviare email con Resend
async function sendConfirmationEmailWithResend(prenotazione, evento) {
  const startTime = Date.now();
  
  try {
    logEmail('info', 'Inizio invio email con Resend', {
      prenotazione_id: prenotazione.id,
      evento_id: evento.id,
      destinatario: prenotazione.email
    });

    // Verifica che Resend sia configurato
    if (!resend) {
      console.error('❌ Resend non configurato correttamente');
      return {
        success: false,
        error: 'Servizio email non configurato',
        response_time: Date.now() - startTime,
        service: 'resend'
      };
    }

    console.log('📧 Preparazione contenuto email...');
    const htmlContent = createEmailTemplate(prenotazione, evento);
    
    const textContent = `
Conferma Prenotazione - ${evento.titolo}

Ciao ${prenotazione.nome} ${prenotazione.cognome},

La tua prenotazione per l'evento "${evento.titolo}" è stata confermata!

Dettagli evento:
- Data: ${new Date(evento.data_evento).toLocaleDateString('it-IT')}
- Luogo: Aula Studio Foro - Via Alfieri, 4 - 10045 Piossasco (TO)
- Partecipanti: ${prenotazione.num_partecipanti}

I tuoi dati:
- Nome: ${prenotazione.nome} ${prenotazione.cognome}
- Email: ${prenotazione.email}
- Prenotazione effettuata: ${new Date(prenotazione.data_prenotazione).toLocaleDateString('it-IT')}
${prenotazione.note ? `- Note: ${prenotazione.note}` : ''}

Per informazioni: associazioneforopiossasco@gmail.com

Associazione Foro - Aula Studio
Via Alfieri, 4 - 10045 Piossasco (TO)
    `.trim();

    console.log('📤 Invio email tramite Resend API...', {
      from: 'noreply@aulastudioforo.com',
      to: prenotazione.email,
      subject: `✅ Conferma prenotazione: ${evento.titolo}`,
      html_length: htmlContent.length,
      text_length: textContent.length
    });

    const emailPayload = {
      from: 'Aula Studio Foro <noreply@aulastudioforo.com>',
      to: [prenotazione.email],
      subject: `✅ Conferma prenotazione: ${evento.titolo}`,
      html: htmlContent,
      text: textContent,
      reply_to: 'associazioneforopiossasco@gmail.com',
      headers: {
        'X-Entity-Ref-ID': `prenotazione-${prenotazione.id}`,
      },
    };

    console.log('🔄 Chiamata API Resend in corso...');
    const { data, error } = await resend.emails.send(emailPayload);

    const responseTime = Date.now() - startTime;

    if (error) {
      console.error('❌ ERRORE RESEND API:', {
        error_name: error.name,
        error_message: error.message,
        error_code: error.code,
        full_error: error,
        response_time_ms: responseTime
      });
      
      logEmail('error', 'Errore Resend API', {
        error_name: error.name,
        error_message: error.message,
        error_code: error.code,
        response_time_ms: responseTime,
        destinatario: prenotazione.email
      });
      
      return {
        success: false,
        error: error.message,
        error_code: error.code,
        details: error,
        response_time: responseTime,
        service: 'resend'
      };
    }

    console.log('✅ EMAIL INVIATA CON SUCCESSO!', {
      message_id: data.id,
      response_time_ms: responseTime,
      destinatario: prenotazione.email,
      resend_data: data
    });

    logEmail('success', 'Email inviata con successo tramite Resend', {
      message_id: data.id,
      response_time_ms: responseTime,
      destinatario: prenotazione.email
    });

    return {
      success: true,
      message_id: data.id,
      response_time: responseTime,
      service: 'resend',
      resend_data: data
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('💥 ECCEZIONE durante invio email:', {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      response_time_ms: responseTime,
      prenotazione_email: prenotazione.email,
      evento_titolo: evento.titolo
    });
    
    logEmail('error', 'Errore durante invio email con Resend', {
      error_name: error.name,
      error_message: error.message,
      response_time_ms: responseTime,
      prenotazione_email: prenotazione.email,
      evento_titolo: evento.titolo
    });

    return {
      success: false,
      error: error.message,
      details: {
        name: error.name,
        stack: error.stack
      },
      response_time: responseTime,
      service: 'resend'
    };
  }
}

// Funzione per inviare email broadcast
async function sendBroadcastEmail(prenotazioni, eventoInfo, emailData) {
  const startTime = Date.now();
  const results = [];
  
  try {
    logEmail('info', 'Inizio invio email broadcast', {
      destinatari_count: prenotazioni.length,
      evento_id: eventoInfo.id,
      evento_titolo: eventoInfo.titolo,
      subject: emailData.subject
    });

    for (const prenotazione of prenotazioni) {
      try {
        const htmlContent = createBroadcastEmailTemplate(prenotazione, eventoInfo, emailData);
        
        const textContent = `
${emailData.subject}

Ciao ${prenotazione.nome}!

Ti scriviamo in merito alla tua prenotazione per l'evento "${eventoInfo.titolo}".

MESSAGGIO:
${emailData.message}

DETTAGLI EVENTO:
- Titolo: ${eventoInfo.titolo}
- Data: ${new Date(eventoInfo.data_evento).toLocaleDateString('it-IT')}
- Luogo: Via Alfieri, 4 - 10045 Piossasco (TO)

CONTATTI:
- Email: associazioneforopiossasco@gmail.com
- Telegram: https://t.me/aulastudioforo

Associazione Foro - Aula Studio
Via Alfieri, 4 - 10045 Piossasco (TO)
        `.trim();

        const { data, error } = await resend.emails.send({
          from: 'Aula Studio Foro <noreply@aulastudioforo.com>',
          to: [prenotazione.email],
          subject: emailData.subject,
          html: htmlContent,
          text: textContent,
          reply_to: 'associazioneforopiossasco@gmail.com',
          headers: {
            'X-Entity-Ref-ID': `broadcast-${eventoInfo.id}-${prenotazione.id}`,
          },
        });

        if (error) {
          results.push({
            prenotazione_id: prenotazione.id,
            email: prenotazione.email,
            success: false,
            error: error.message
          });
        } else {
          results.push({
            prenotazione_id: prenotazione.id,
            email: prenotazione.email,
            success: true,
            message_id: data.id
          });
        }

        // Pausa tra invii
        if (prenotazioni.indexOf(prenotazione) < prenotazioni.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (emailError) {
        results.push({
          prenotazione_id: prenotazione.id,
          email: prenotazione.email,
          success: false,
          error: emailError.message
        });
      }
    }

    const responseTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return {
      success: true,
      total_sent: prenotazioni.length,
      successful: successCount,
      failed: errorCount,
      response_time: responseTime,
      results: results
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      error: error.message,
      response_time: responseTime,
      results: results
    };
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
      
      // ENDPOINT BROADCAST EMAIL
      if (section === 'broadcast') {
        const { 
          evento_id, 
          subject, 
          message, 
          user_id 
        } = req.body;
        
        console.log('Invio broadcast email:', { 
          evento_id, 
          subject: subject ? 'present' : 'missing',
          message: message ? 'present' : 'missing',
          user_id 
        });

        // Validazione campi obbligatori
        if (!evento_id || !subject || !message || !user_id) {
          return res.status(400).json({
            success: false,
            error: 'Evento ID, oggetto, messaggio e user_id sono richiesti'
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

        // Recupera tutte le prenotazioni per l'evento
        const prenotazioniResult = await client.execute({
          sql: 'SELECT * FROM prenotazioni_eventi WHERE evento_id = ? ORDER BY data_prenotazione ASC',
          args: [evento_id]
        });

        const prenotazioni = convertBigIntToNumber(prenotazioniResult.rows);

        if (prenotazioni.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Nessuna prenotazione trovata per questo evento'
          });
        }

        // Invia le email broadcast
        console.log('🚀 Invio email broadcast a', prenotazioni.length, 'destinatari...');
        const broadcastResult = await sendBroadcastEmail(prenotazioni, evento, {
          subject: subject.trim(),
          message: message.trim()
        });
        
        console.log('📧 Risultato broadcast:', broadcastResult);

        return res.status(200).json({
          success: true,
          message: 'Email broadcast inviate',
          broadcast_details: broadcastResult,
          evento_titolo: evento.titolo,
          destinatari_count: prenotazioni.length
        });
      }
      
      // ENDPOINT PRENOTAZIONI
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
        
        console.log('🎫 NUOVA PRENOTAZIONE - Dati ricevuti:', { 
          evento_id, 
          nome: nome ? 'presente' : 'mancante', 
          cognome: cognome ? 'presente' : 'mancante', 
          email: email ? email : 'mancante', 
          num_biglietti, 
          note: note ? 'presente' : 'vuoto'
        });

        // Validazione campi obbligatori
        if (!evento_id || !nome || !cognome || !email) {
          console.log('❌ Validazione fallita - campi mancanti');
          return res.status(400).json({
            success: false,
            error: 'Evento ID, nome, cognome e email sono richiesti'
          });
        }

        // Log dettagliato dell'email prima della validazione
        const emailOriginal = email;
        const emailProcessed = email.toLowerCase().trim();
        
        console.log('📧 VALIDAZIONE EMAIL:', {
          email_originale: emailOriginal,
          email_processata: emailProcessed,
          lunghezza: emailProcessed.length,
          contiene_at: emailProcessed.includes('@'),
          numero_at: (emailProcessed.match(/@/g) || []).length
        });

        // Validazione email con logging dettagliato
        if (!validateEmail(emailProcessed)) {
          console.log('❌ VALIDAZIONE EMAIL FALLITA per:', emailProcessed);
          
          // Debug aggiuntivo per capire perché fallisce
          const parts = emailProcessed.split('@');
          if (parts.length === 2) {
            const [localPart, domainPart] = parts;
            console.log('📧 Debug email parts:', {
              local_part: localPart,
              local_length: localPart.length,
              domain_part: domainPart,
              domain_length: domainPart.length,
              domain_has_dot: domainPart.includes('.'),
              domain_parts: domainPart.split('.')
            });
          }
          
          return res.status(400).json({
            success: false,
            error: 'Formato email non valido'
          });
        }

        console.log('✅ Email validata correttamente:', emailProcessed);

        // Validazione numero biglietti
        const numPartecipanti = num_biglietti || 1;
        if (numPartecipanti < 1 || numPartecipanti > 10) {
          console.log('❌ Numero partecipanti non valido:', numPartecipanti);
          return res.status(400).json({
            success: false,
            error: 'Il numero di partecipanti deve essere tra 1 e 10'
          });
        }

        // Verifica che l'evento esista
        console.log('🔍 Verifico esistenza evento:', evento_id);
        const eventoResult = await client.execute({
          sql: 'SELECT * FROM eventi WHERE id = ?',
          args: [evento_id]
        });

        if (!eventoResult.rows.length) {
          console.log('❌ Evento non trovato:', evento_id);
          return res.status(404).json({
            success: false,
            error: 'Evento non trovato'
          });
        }

        const evento = convertBigIntToNumber(eventoResult.rows[0]);
        evento.immagine_blob = blobToBase64(evento.immagine_blob);
        
        console.log('✅ Evento trovato:', evento.titolo);

        // Verifica che l'evento non sia già passato
        const eventoDate = new Date(evento.data_evento);
        const now = new Date();
        if (eventoDate < now) {
          console.log('❌ Evento già passato:', eventoDate, 'vs', now);
          return res.status(400).json({
            success: false,
            error: 'Non è possibile prenotarsi per eventi già passati'
          });
        }

        // RIMOSSO: Controllo duplicati - ora è possibile prenotare più volte con la stessa email
        console.log('✅ Controllo duplicati rimosso - email multipla permessa:', emailProcessed);

        // Crea la prenotazione
        const dataPrenotazione = data_prenotazione || new Date().toISOString();
        
        console.log('💾 Inserimento prenotazione nel database...');
        
        try {
          const result = await client.execute({
            sql: `INSERT INTO prenotazioni_eventi 
                  (evento_id, nome, cognome, email, num_partecipanti, note, data_prenotazione) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
              evento_id,
              nome.trim(),
              cognome.trim(),
              emailProcessed,
              numPartecipanti,
              note?.trim() || '',
              dataPrenotazione
            ]
          });

          console.log('📊 Risultato inserimento database:', {
            rows_affected: result.rowsAffected,
            last_insert_id: result.lastInsertRowid
          });

          if (result.rowsAffected > 0) {
            const prenotazioneId = convertBigIntToNumber(result.lastInsertRowid);
            
            // Prepara i dati della prenotazione per l'email
            const prenotazioneData = {
              id: prenotazioneId,
              evento_id,
              nome: nome.trim(),
              cognome: cognome.trim(),
              email: emailProcessed,
              num_partecipanti: numPartecipanti,
              note: note?.trim() || '',
              data_prenotazione: dataPrenotazione
            };

            // Invia email di conferma con Resend
            console.log('🚀 Invio email di conferma con Resend per:', emailProcessed);
            const emailResult = await sendConfirmationEmailWithResend(prenotazioneData, evento);
            
            console.log('📧 RISULTATO FINALE EMAIL:', {
              success: emailResult.success,
              message_id: emailResult.message_id,
              error: emailResult.error,
              error_code: emailResult.error_code,
              service: emailResult.service,
              response_time: emailResult.response_time
            });

            return res.status(201).json({
              success: true,
              message: 'Prenotazione creata con successo',
              prenotazione_id: prenotazioneId,
              email_sent: emailResult.success,
              email_details: {
                success: emailResult.success,
                message_id: emailResult.message_id,
                error: emailResult.error,
                error_code: emailResult.error_code,
                service: emailResult.service,
                response_time: emailResult.response_time
              },
              created_at: dataPrenotazione,
              debug_info: {
                email_destinatario: emailProcessed,
                evento_titolo: evento.titolo,
                timestamp: new Date().toISOString()
              }
            });
          } else {
            console.log('❌ Nessuna riga inserita nel database');
            return res.status(400).json({
              success: false,
              error: 'Errore nella creazione della prenotazione'
            });
          }
        } catch (dbError) {
          console.error('💥 Errore database durante inserimento:', dbError);
          
          // Analizza il tipo di errore
          if (dbError.message && dbError.message.includes('UNIQUE')) {
            return res.status(409).json({
              success: false,
              error: 'Esiste già una prenotazione con questi dati'
            });
          }
          
          return res.status(500).json({
            success: false,
            error: 'Errore database: ' + dbError.message
          });
        }
      }

      // ENDPOINT EVENTI
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

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(data_evento)) {
          return res.status(400).json({
            success: false,
            error: 'Formato data non valido. Utilizzare YYYY-MM-DD'
          });
        }

        if (immagine_blob && !validateBase64Image(immagine_blob)) {
          return res.status(400).json({
            success: false,
            error: 'Formato immagine non valido'
          });
        }

        let blobToSave = null;
        if (immagine_blob) {
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

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data_evento)) {
        return res.status(400).json({
          success: false,
          error: 'Formato data non valido. Utilizzare YYYY-MM-DD'
        });
      }

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

      if (immagine_blob && !validateBase64Image(immagine_blob)) {
        return res.status(400).json({
          success: false,
          error: 'Formato immagine non valido'
        });
      }

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
      if (section === 'prenotazioni') {
        const { id, user_id } = req.body;
        console.log('Deleting prenotazione:', { id, user_id });

        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'ID prenotazione richiesto'
          });
        }

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
      
      else {
        const { id, user_id } = req.body;
        console.log('Deleting evento:', { id, user_id });

        if (!id || !user_id) {
          return res.status(400).json({
            success: false,
            error: 'ID evento e user_id richiesti'
          });
        }

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

        await client.execute({
          sql: 'DELETE FROM prenotazioni_eventi WHERE evento_id = ?',
          args: [id]
        });

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
    console.error('💥 ERRORE GENERALE API eventi:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Errore interno del server: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}