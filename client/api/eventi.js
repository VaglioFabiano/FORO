import { createClient } from "@libsql/client/web";
import nodemailer from "nodemailer";

// ==========================================
// 1. CONFIGURAZIONE
// ==========================================

const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
};

if (!config.url || !config.authToken) {
  console.error("Mancano le variabili d'ambiente per il DB!");
  throw new Error("Configurazione database mancante");
}

const client = createClient(config);

// Configurazione Nodemailer (Solo GMAIL)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ==========================================
// 2. FUNZIONI DI UTILITÀ
// ==========================================

function validateBase64Image(base64String) {
  if (!base64String) return true;
  // Controlla se è un formato immagine valido
  return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(base64String);
}

// Converte il BLOB del database in stringa Base64 per il frontend
function blobToBase64(blob) {
  if (!blob) return null;
  // Se è già stringa, ritornala
  if (typeof blob === "string" && blob.startsWith("data:image/")) return blob;
  // Se è un buffer, converti
  if (Buffer.isBuffer(blob) || blob instanceof Uint8Array) {
    return `data:image/jpeg;base64,${Buffer.from(blob).toString("base64")}`;
  }
  return null;
}

// Turso restituisce BigInt, che JSON.stringify non supporta. Li convertiamo in Number.
function convertBigIntToNumber(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
  if (typeof obj === "object") {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToNumber(value);
    }
    return converted;
  }
  return obj;
}

function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim());
}

// ==========================================
// 3. FUNZIONI INVIO EMAIL
// ==========================================

// Funzione generica di invio
async function sendEmail(to, subject, htmlContent, textContent) {
  console.log(`📧 Tentativo invio a: ${to}`);

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("❌ Credenziali Gmail mancanti nelle variabili d'ambiente");
    return { success: false, error: "Configurazione server errata" };
  }

  try {
    await transporter.sendMail({
      from: `Associazione Foro <${process.env.GMAIL_USER}>`,
      to: to,
      replyTo: process.env.GMAIL_USER,
      subject: subject,
      text: textContent,
      html: htmlContent,
    });
    console.log(`✅ Email inviata con successo a ${to}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Errore invio email a ${to}:`, error);
    return { success: false, error: error.message };
  }
}

// Template HTML Conferma Prenotazione (Singola)
function createConfirmationTemplate(prenotazione, evento) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background: white; padding: 30px; border-radius: 10px; border-top: 5px solid #2e7d32; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #2e7d32; margin-top: 0;">Prenotazione Confermata! ✅</h1>
        <p>Ciao <strong>${prenotazione.nome}</strong>,</p>
        <p>Ti confermiamo che la tua prenotazione per l'evento è andata a buon fine.</p>
        
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1b5e20;">${evento.titolo}</h3>
          <p style="margin: 5px 0;">📅 <strong>Data:</strong> ${new Date(evento.data_evento).toLocaleDateString("it-IT")}</p>
          <p style="margin: 5px 0;">📍 <strong>Luogo:</strong> Via Alfieri, 4 - Piossasco (TO)</p>
          <p style="margin: 5px 0;">🎟️ <strong>Posti prenotati:</strong> ${prenotazione.num_partecipanti}</p>
        </div>

        <p style="font-size: 0.9em; color: #555;">Se hai bisogno di modificare la prenotazione, rispondi a questa email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="text-align: center; font-size: 0.8em; color: #888;">Associazione Foro - Piossasco</p>
      </div>
    </div>
  `;
}

// Template HTML Broadcast (Admin -> Tutti)
function createBroadcastTemplate(message, titoloEvento) {
  const formattedMessage = message.replace(/\n/g, "<br>");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background: white; padding: 30px; border-radius: 10px; border-top: 5px solid #d2691e; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #d2691e; margin-top: 0;">Comunicazione Importante 📢</h2>
        <p style="color: #666; font-size: 0.9em;">Riguardo all'evento: <strong>${titoloEvento}</strong></p>
        
        <div style="font-size: 16px; line-height: 1.6; color: #333; margin: 20px 0;">
          ${formattedMessage}
        </div>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="text-align: center; font-size: 0.8em; color: #888;">Associazione Foro - Piossasco</p>
      </div>
    </div>
  `;
}

// ==========================================
// 4. HANDLER PRINCIPALE API
// ==========================================

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Health check DB
    await client.execute("SELECT 1");

    const { section, action, id, evento_id } = req.query;

    // --- GET (LETTURA) ---
    if (req.method === "GET") {
      // 1. Lista Eventi (Home)
      if (!section && !action) {
        const result = await client.execute(
          `SELECT * FROM eventi ORDER BY data_evento DESC`,
        );
        const eventi = result.rows.map((row) => {
          const e = convertBigIntToNumber(row);
          // Converti il blob in base64 per mostrarlo nel sito
          e.immagine_blob = blobToBase64(e.immagine_blob);
          return e;
        });
        return res.status(200).json({ success: true, eventi });
      }

      // 2. Dettaglio Singolo Evento
      if (action === "single" && id) {
        const eventoResult = await client.execute({
          sql: `SELECT * FROM eventi WHERE id = ?`,
          args: [id],
        });
        if (!eventoResult.rows.length)
          return res.status(404).json({ error: "Non trovato" });

        const evento = convertBigIntToNumber(eventoResult.rows[0]);
        evento.immagine_blob = blobToBase64(evento.immagine_blob);

        const prenotazioniResult = await client.execute({
          sql: "SELECT * FROM prenotazioni_eventi WHERE evento_id = ? ORDER BY data_prenotazione DESC",
          args: [id],
        });

        return res.status(200).json({
          success: true,
          evento,
          prenotazioni: convertBigIntToNumber(prenotazioniResult.rows),
        });
      }

      // 3. Solo Prenotazioni (Admin)
      if (section === "prenotazioni") {
        let query = "SELECT * FROM prenotazioni_eventi";
        let args = [];

        if (evento_id) {
          query += " WHERE evento_id = ?";
          args.push(evento_id);
        }
        query += " ORDER BY data_prenotazione DESC";

        const result = await client.execute({ sql: query, args });
        return res
          .status(200)
          .json({
            success: true,
            prenotazioni: convertBigIntToNumber(result.rows),
          });
      }
    }

    // --- POST (CREAZIONE & EMAIL) ---
    if (req.method === "POST") {
      // 1. Broadcast Email (Admin invia a tutti)
      if (section === "broadcast") {
        const { evento_id, subject, message } = req.body;

        // Trova iscritti
        const prenotazioni = await client.execute({
          sql: "SELECT email, nome FROM prenotazioni_eventi WHERE evento_id = ?",
          args: [evento_id],
        });

        if (prenotazioni.rows.length === 0) {
          return res
            .status(400)
            .json({
              success: false,
              error: "Nessun iscritto trovato per questo evento.",
            });
        }

        // Info evento
        const evResult = await client.execute({
          sql: "SELECT titolo, data_evento FROM eventi WHERE id=?",
          args: [evento_id],
        });
        const evento = evResult.rows[0];
        const htmlBody = createBroadcastTemplate(message, evento.titolo);

        // Invio sequenziale per non bloccare SMTP
        let sentCount = 0;
        for (const p of prenotazioni.rows) {
          const resEmail = await sendEmail(
            p.email,
            subject,
            htmlBody,
            message, // Fallback testo semplice
          );
          if (resEmail.success) sentCount++;
        }

        return res.status(200).json({
          success: true,
          destinatari_count: sentCount,
          message: `Inviate ${sentCount} email su ${prenotazioni.rows.length}`,
        });
      }

      // 2. Nuova Prenotazione (Utente pubblico -> Conferma Automatica)
      if (section === "prenotazioni") {
        const { evento_id, nome, cognome, email, num_biglietti, note } =
          req.body;

        if (!validateEmail(email)) {
          return res.status(400).json({ error: "Email non valida" });
        }

        // Salva DB
        const result = await client.execute({
          sql: `INSERT INTO prenotazioni_eventi (evento_id, nome, cognome, email, num_partecipanti, note, data_prenotazione) 
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          args: [
            evento_id,
            nome,
            cognome,
            email.toLowerCase().trim(),
            num_biglietti || 1,
            note || "",
          ],
        });

        // Recupera info evento per mandare l'email di conferma
        const evResult = await client.execute({
          sql: "SELECT * FROM eventi WHERE id=?",
          args: [evento_id],
        });
        const evento = evResult.rows[0];

        // Prepara la mail
        const pData = { nome, cognome, num_partecipanti: num_biglietti || 1 };
        const htmlConfirm = createConfirmationTemplate(pData, evento);
        const textConfirm = `Ciao ${nome}, prenotazione confermata per ${evento.titolo}.`;

        // Invia conferma (await per essere sicuri che parta prima di rispondere al client)
        // Se l'invio fallisce, l'utente vedrà l'errore ma la prenotazione è salvata.
        try {
          await sendEmail(
            email,
            `Conferma Prenotazione: ${evento.titolo}`,
            htmlConfirm,
            textConfirm,
          );
        } catch (e) {
          console.error("Errore invio mail conferma:", e);
        }

        return res.status(201).json({
          success: true,
          id: convertBigIntToNumber(result.lastInsertRowid),
          message: "Prenotazione effettuata!",
        });
      }

      // 3. Creazione Evento (Admin)
      const {
        titolo,
        descrizione,
        data_evento,
        immagine_url,
        immagine_blob,
        user_id,
      } = req.body;

      let blobBuffer = null;
      if (immagine_blob) {
        // Rimuove l'header del base64 se presente per salvare solo i dati binari
        const base64Data = immagine_blob.split(";base64,").pop();
        blobBuffer = Buffer.from(base64Data, "base64");
      }

      await client.execute({
        sql: `INSERT INTO eventi (titolo, descrizione, data_evento, immagine_url, immagine_blob, user_id) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          titolo,
          descrizione,
          data_evento,
          immagine_url,
          blobBuffer,
          user_id,
        ],
      });

      return res.status(201).json({ success: true });
    }

    // --- PUT (MODIFICA EVENTO) ---
    if (req.method === "PUT") {
      const {
        id,
        titolo,
        descrizione,
        data_evento,
        immagine_url,
        immagine_blob,
      } = req.body;

      let sql = `UPDATE eventi SET titolo=?, descrizione=?, data_evento=?, immagine_url=?`;
      let args = [titolo, descrizione, data_evento, immagine_url];

      if (immagine_blob) {
        const base64Data = immagine_blob.split(";base64,").pop();
        const blobBuffer = Buffer.from(base64Data, "base64");
        sql += `, immagine_blob=?`;
        args.push(blobBuffer);
      }

      sql += ` WHERE id=?`;
      args.push(id);

      await client.execute({ sql, args });
      return res.status(200).json({ success: true });
    }

    // --- DELETE (ELIMINAZIONE) ---
    if (req.method === "DELETE") {
      const { id } = req.body;

      if (section === "prenotazioni") {
        await client.execute({
          sql: "DELETE FROM prenotazioni_eventi WHERE id = ?",
          args: [id],
        });
      } else {
        // Cancella evento (e prenotazioni collegate manualmente per sicurezza)
        await client.execute({
          sql: "DELETE FROM prenotazioni_eventi WHERE evento_id = ?",
          args: [id],
        });
        await client.execute({
          sql: "DELETE FROM eventi WHERE id = ?",
          args: [id],
        });
      }
      return res.status(200).json({ success: true });
    }

    return res
      .status(405)
      .json({ success: false, error: "Metodo non supportato" });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server: " + error.message,
    });
  }
}
