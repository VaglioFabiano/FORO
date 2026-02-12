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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// ==========================================
// 3. FUNZIONI INVIO EMAIL
// ==========================================

async function sendEmail(to, subject, htmlContent, textContent) {
  console.log(`📧 Tentativo invio a: ${to}`);

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("❌ Credenziali Gmail mancanti");
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Health check DB
    await client.execute("SELECT 1");

    const { section, action, id, evento_id } = req.query;

    // --- GET ---
    if (req.method === "GET") {
      // 1. SCARICARE IMMAGINE (Nuovo Endpoint Dedicato)
      if (action === "image" && id) {
        const result = await client.execute({
          sql: "SELECT immagine_blob, immagine_tipo FROM eventi WHERE id = ?",
          args: [id],
        });

        if (result.rows.length === 0 || !result.rows[0].immagine_blob) {
          return res.status(404).end();
        }

        const row = result.rows[0];
        // Converte Uint8Array/Buffer in Buffer Node.js standard
        const buffer = Buffer.from(row.immagine_blob);

        res.setHeader("Content-Type", row.immagine_tipo || "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400"); // Cache per 1 giorno
        return res.send(buffer);
      }

      // 2. LISTA EVENTI (Ottimizzata: Niente BLOB pesante)
      if (!section && !action) {
        // Selezioniamo tutto TRANNE il blob pesante. Usiamo length() per sapere se l'immagine esiste.
        const result = await client.execute(`
            SELECT id, titolo, descrizione, data_evento, immagine_url, immagine_tipo, 
            length(immagine_blob) as blob_size 
            FROM eventi 
            ORDER BY data_evento DESC
        `);

        const eventi = result.rows.map((row) => {
          const e = convertBigIntToNumber(row);
          // Se c'è un blob nel DB (size > 0), generiamo l'URL per scaricarlo
          if (e.blob_size > 0) {
            e.immagine_url = `/api/eventi?action=image&id=${e.id}`;
          }
          // Pulizia
          delete e.blob_size;
          return e;
        });

        return res.status(200).json({ success: true, eventi });
      }

      // 3. DETTAGLIO EVENTO (Singolo)
      if (action === "single" && id) {
        // Qui possiamo mandare il blob perché è un solo evento
        const eventoResult = await client.execute({
          sql: `SELECT * FROM eventi WHERE id = ?`,
          args: [id],
        });
        if (!eventoResult.rows.length)
          return res.status(404).json({ error: "Non trovato" });

        const evento = convertBigIntToNumber(eventoResult.rows[0]);

        // Se c'è il blob, meglio usare comunque l'URL per coerenza, ma possiamo mandare base64 se serve subito
        if (evento.immagine_blob) {
          evento.immagine_url = `/api/eventi?action=image&id=${evento.id}`;
          delete evento.immagine_blob; // Rimuoviamo il blob pesante dal JSON
        }

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

      // 4. SOLO PRENOTAZIONI
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

        const prenotazioni = await client.execute({
          sql: "SELECT email, nome FROM prenotazioni_eventi WHERE evento_id = ?",
          args: [evento_id],
        });

        if (prenotazioni.rows.length === 0) {
          return res
            .status(400)
            .json({ success: false, error: "Nessun iscritto trovato." });
        }

        const evResult = await client.execute({
          sql: "SELECT titolo FROM eventi WHERE id=?",
          args: [evento_id],
        });
        const titoloEvento = evResult.rows[0]?.titolo || "Evento";
        const htmlBody = createBroadcastTemplate(message, titoloEvento);

        let sentCount = 0;
        for (const p of prenotazioni.rows) {
          // Invio non bloccante per il loop (ma aspetta la singola promise per non sovraccaricare)
          const resEmail = await sendEmail(p.email, subject, htmlBody, message);
          if (resEmail.success) sentCount++;
        }

        return res.status(200).json({
          success: true,
          destinatari_count: sentCount,
          message: `Inviate ${sentCount} email.`,
        });
      }

      // 2. NUOVA PRENOTAZIONE
      if (section === "prenotazioni") {
        const { evento_id, nome, cognome, email, num_biglietti, note } =
          req.body;

        if (!validateEmail(email)) {
          return res.status(400).json({ error: "Email non valida" });
        }

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

        // Recupera dati per email
        const evResult = await client.execute({
          sql: "SELECT * FROM eventi WHERE id=?",
          args: [evento_id],
        });
        const evento = evResult.rows[0];

        const pData = { nome, cognome, num_partecipanti: num_biglietti || 1 };
        const htmlConfirm = createConfirmationTemplate(pData, evento);

        // Invio Email (senza bloccare la risposta HTTP se lento)
        sendEmail(
          email,
          `Conferma Prenotazione: ${evento.titolo}`,
          htmlConfirm,
          `Confermata prenotazione per ${evento.titolo}`,
        ).catch((err) => console.error("Errore background mail:", err));

        return res.status(201).json({
          success: true,
          id: insertId,
          message: "Prenotazione salvata!",
        });
      }

      // 3. CREAZIONE EVENTO
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
        const base64Data = immagine_blob.split(";base64,").pop();
        blobBuffer = Buffer.from(base64Data, "base64");
      }

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
