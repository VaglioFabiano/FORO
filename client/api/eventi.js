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
  // Se è un array di numeri (formato JSON di Turso a volte)
  if (Array.isArray(blob)) {
    return `data:image/jpeg;base64,${Buffer.from(blob).toString("base64")}`;
  }
  return null;
}

// Helper per i numeri BigInt di Turso
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
  // Regex standard per email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// ==========================================
// 3. FUNZIONI INVIO EMAIL
// ==========================================

async function sendEmail(to, subject, htmlContent, textContent) {
  console.log(`📧 Tentativo invio a: ${to}`);

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("❌ Credenziali Gmail mancanti nelle variabili d'ambiente");
    // Non blocchiamo l'esecuzione, ritorniamo solo errore
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

function createConfirmationTemplate(prenotazione, evento) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Prenotazione Confermata ✅</h2>
        <p>Ciao <strong>${prenotazione.nome}</strong>,</p>
        <p>Ti confermiamo la tua iscrizione all'evento:</p>
        <h3 style="color: #333;">${evento.titolo}</h3>
        <p><strong>📅 Data:</strong> ${new Date(evento.data_evento).toLocaleDateString("it-IT")}</p>
        <p><strong>📍 Luogo:</strong> Via Alfieri, 4 - Piossasco (TO)</p>
        <hr>
        <p style="font-size: 12px; color: #666;">Associazione Foro</p>
      </div>
    </div>
  `;
}

function createBroadcastTemplate(message, titoloEvento) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d84315;">Avviso: ${titoloEvento} 📢</h2>
        <p style="white-space: pre-line;">${message}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">Associazione Foro</p>
      </div>
    </div>
  `;
}

// ==========================================
// 4. HANDLER PRINCIPALE API
// ==========================================

export default async function handler(req, res) {
  // Configurazione CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Health check veloce al DB
    await client.execute("SELECT 1");

    const { section, action, id, evento_id } = req.query;

    // --- GET ---
    if (req.method === "GET") {
      // 1. LISTA EVENTI
      if (!section && !action) {
        // Recuperiamo tutto. Se le immagini sono pesanti, questo potrebbe rallentare.
        const result = await client.execute(
          `SELECT * FROM eventi ORDER BY data_evento DESC`,
        );

        const eventi = result.rows.map((row) => {
          const e = convertBigIntToNumber(row);
          // Decodifica il BLOB in base64 per il frontend
          e.immagine_blob = blobToBase64(e.immagine_blob);
          return e;
        });

        return res.status(200).json({ success: true, eventi });
      }

      // 2. DETTAGLIO EVENTO + PRENOTAZIONI
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

      // 3. SOLO PRENOTAZIONI
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

    // --- POST ---
    if (req.method === "POST") {
      // 1. BROADCAST EMAIL
      if (section === "broadcast") {
        const { evento_id, subject, message } = req.body;

        // Recupera iscritti
        const prenotazioni = await client.execute({
          sql: "SELECT email, nome FROM prenotazioni_eventi WHERE evento_id = ?",
          args: [evento_id],
        });

        if (prenotazioni.rows.length === 0) {
          return res
            .status(400)
            .json({ success: false, error: "Nessun iscritto trovato." });
        }

        // Recupera titolo evento
        const evResult = await client.execute({
          sql: "SELECT titolo FROM eventi WHERE id=?",
          args: [evento_id],
        });
        const titoloEvento = evResult.rows[0]?.titolo || "Evento";
        const htmlBody = createBroadcastTemplate(message, titoloEvento);

        // Invio Non Bloccante (Loop)
        let sentCount = 0;
        for (const p of prenotazioni.rows) {
          const resEmail = await sendEmail(p.email, subject, htmlBody, message);
          if (resEmail.success) sentCount++;
        }

        return res.status(200).json({
          success: true,
          destinatari_count: sentCount,
          message: `Inviate ${sentCount} email.`,
        });
      }

      // 2. NUOVA PRENOTAZIONE (UTENTE)
      if (section === "prenotazioni") {
        const { evento_id, nome, cognome, email, num_biglietti, note } =
          req.body;

        if (!validateEmail(email)) {
          return res.status(400).json({ error: "Email non valida" });
        }

        // Inserimento DB
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

        const insertId = convertBigIntToNumber(result.lastInsertRowid);

        // Recupera dati evento per la mail
        const evResult = await client.execute({
          sql: "SELECT * FROM eventi WHERE id=?",
          args: [evento_id],
        });
        const evento = evResult.rows[0];

        // Invio Email Conferma (Non blocchiamo se fallisce la mail, l'importante è la prenotazione)
        const pData = { nome, cognome, num_partecipanti: num_biglietti || 1 };
        const htmlConfirm = createConfirmationTemplate(pData, evento);

        // Eseguiamo l'invio ma non aspettiamo all'infinito o blocchiamo l'errore
        try {
          await sendEmail(
            email,
            `Conferma Prenotazione: ${evento.titolo}`,
            htmlConfirm,
            `Confermata prenotazione per ${evento.titolo}`,
          );
        } catch (e) {
          console.error("Errore invio mail conferma (non bloccante):", e);
        }

        return res.status(201).json({
          success: true,
          id: insertId,
          message: "Prenotazione salvata!",
        });
      }

      // 3. CREAZIONE EVENTO (ADMIN)
      const {
        titolo,
        descrizione,
        data_evento,
        immagine_url,
        immagine_blob,
        immagine_tipo,
        immagine_nome,
      } = req.body;

      let blobBuffer = null;
      if (immagine_blob) {
        // Rimuove l'header del base64
        const base64Data = immagine_blob.split(";base64,").pop();
        blobBuffer = Buffer.from(base64Data, "base64");
      }

      // Query SENZA user_id (come da tua richiesta)
      const result = await client.execute({
        sql: `INSERT INTO eventi (titolo, descrizione, data_evento, immagine_url, immagine_blob, immagine_tipo, immagine_nome) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          titolo,
          descrizione || "",
          data_evento,
          immagine_url || "",
          blobBuffer,
          immagine_tipo || "",
          immagine_nome || "",
        ],
      });

      return res.status(201).json({
        success: true,
        id: convertBigIntToNumber(result.lastInsertRowid),
      });
    }

    // --- PUT (MODIFICA) ---
    if (req.method === "PUT") {
      const {
        id,
        titolo,
        descrizione,
        data_evento,
        immagine_url,
        immagine_blob,
        immagine_tipo,
        immagine_nome,
      } = req.body;

      let sql = `UPDATE eventi SET titolo=?, descrizione=?, data_evento=?, immagine_url=?`;
      let args = [titolo, descrizione, data_evento, immagine_url];

      if (immagine_blob) {
        const base64Data = immagine_blob.split(";base64,").pop();
        const blobBuffer = Buffer.from(base64Data, "base64");
        sql += `, immagine_blob=?, immagine_tipo=?, immagine_nome=?`;
        args.push(blobBuffer, immagine_tipo || "", immagine_nome || "");
      }

      sql += ` WHERE id=?`;
      args.push(id);

      await client.execute({ sql, args });
      return res.status(200).json({ success: true });
    }

    // --- DELETE ---
    if (req.method === "DELETE") {
      const { id } = req.body;

      if (section === "prenotazioni") {
        await client.execute({
          sql: "DELETE FROM prenotazioni_eventi WHERE id = ?",
          args: [id],
        });
      } else {
        // Cancella evento e prenotazioni collegate
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
      error: "Errore server: " + error.message,
    });
  }
}
