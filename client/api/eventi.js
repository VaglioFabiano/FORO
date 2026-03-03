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

  // FIX VERCEL: Evita di iterare sui buffer binari
  if (
    obj instanceof ArrayBuffer ||
    ArrayBuffer.isView(obj) ||
    (typeof Buffer !== "undefined" && Buffer.isBuffer(obj))
  ) {
    return obj;
  }

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
  console.log(`Tentativo invio a: ${to}`);

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("Credenziali Gmail mancanti");
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
    console.log(`Email inviata con successo a ${to}`);
    return { success: true };
  } catch (error) {
    console.error(`Errore invio email a ${to}:`, error);
    return { success: false, error: error.message };
  }
}

function createConfirmationTemplate(prenotazione, evento) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Prenotazione Confermata</h2>
        <p>Ciao <strong>${prenotazione.nome}</strong>,</p>
        <p>Ti confermiamo la tua iscrizione all'evento:</p>
        <h3 style="color: #333;">${evento.titolo}</h3>
        <p><strong>Data:</strong> ${new Date(evento.data_evento).toLocaleDateString("it-IT")}</p>
        <p><strong>Luogo:</strong> Via Alfieri, 4 - Piossasco (TO)</p>
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
        <h2 style="color: #d84315;">Avviso: ${titoloEvento}</h2>
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
    await client.execute("SELECT 1");

    const { section, action, id, evento_id } = req.query;

    // --- GET ---
    if (req.method === "GET") {
      if (action === "image" && id) {
        const result = await client.execute({
          sql: "SELECT immagine_blob, immagine_tipo FROM eventi WHERE id = ?",
          args: [id],
        });

        if (result.rows.length === 0 || !result.rows[0].immagine_blob) {
          return res.status(404).end();
        }

        const row = result.rows[0];
        let buffer;

        // FIX VERCEL: Gestione sicura del buffer per evitare immagini grigie/corrotte
        if (Buffer.isBuffer(row.immagine_blob)) {
          buffer = row.immagine_blob;
        } else if (row.immagine_blob instanceof ArrayBuffer) {
          buffer = Buffer.from(row.immagine_blob);
        } else if (typeof row.immagine_blob === "string") {
          buffer = Buffer.from(row.immagine_blob, "base64");
        } else {
          buffer = Buffer.from(new Uint8Array(row.immagine_blob));
        }

        res.setHeader("Content-Type", row.immagine_tipo || "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.end(buffer); // Usiamo end() invece di send() per i file binari
      }

      if (!section && !action) {
        const result = await client.execute(`
            SELECT id, titolo, descrizione, data_evento, immagine_url, immagine_tipo, visibile, num_max,
            length(immagine_blob) as blob_size 
            FROM eventi 
            ORDER BY data_evento DESC
        `);

        const eventi = result.rows.map((row) => {
          const e = convertBigIntToNumber(row);
          if (e.blob_size > 0) {
            e.immagine_url = `/api/eventi?action=image&id=${e.id}`;
          }
          delete e.blob_size;
          return e;
        });

        return res.status(200).json({ success: true, eventi });
      }

      if (section === "visibile") {
        const result = await client.execute(`
            SELECT id, titolo, descrizione, data_evento, immagine_url, immagine_tipo, visibile, num_max,
            length(immagine_blob) as blob_size 
            FROM eventi 
            WHERE visibile = 1
            ORDER BY data_evento DESC LIMIT 1
        `);

        if (result.rows.length === 0) {
          return res
            .status(404)
            .json({ success: false, error: "Nessun evento visibile" });
        }

        const evento = convertBigIntToNumber(result.rows[0]);
        if (evento.blob_size > 0) {
          evento.immagine_url = `/api/eventi?action=image&id=${evento.id}`;
        }
        delete evento.blob_size;

        return res.status(200).json({ success: true, evento });
      }

      if (action === "single" && id) {
        // FIX: Rimosso SELECT * per evitare il blocco del server con l'immagine
        const eventoResult = await client.execute({
          sql: `SELECT id, titolo, descrizione, data_evento, immagine_url, immagine_tipo, visibile, num_max, length(immagine_blob) as blob_size FROM eventi WHERE id = ?`,
          args: [id],
        });

        if (!eventoResult.rows.length)
          return res.status(404).json({ error: "Non trovato" });

        const evento = convertBigIntToNumber(eventoResult.rows[0]);

        if (evento.blob_size > 0) {
          evento.immagine_url = `/api/eventi?action=image&id=${evento.id}`;
        }
        delete evento.blob_size;

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

      if (section === "prenotazioni") {
        let query = "SELECT * FROM prenotazioni_eventi";
        let args = [];

        if (evento_id) {
          query += " WHERE evento_id = ?";
          args.push(evento_id);
        }
        query += " ORDER BY data_prenotazione DESC";

        const result = await client.execute({ sql: query, args });
        return res.status(200).json({
          success: true,
          prenotazioni: convertBigIntToNumber(result.rows),
        });
      }
    }

    // --- POST ---
    if (req.method === "POST") {
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
          const resEmail = await sendEmail(p.email, subject, htmlBody, message);
          if (resEmail.success) sentCount++;
        }

        return res.status(200).json({
          success: true,
          destinatari_count: sentCount,
          message: `Inviate ${sentCount} email.`,
        });
      }

      if (section === "prenotazioni") {
        const { evento_id, nome, cognome, email, num_biglietti, note } =
          req.body;

        if (!validateEmail(email)) {
          return res.status(400).json({ error: "Email non valida" });
        }

        const ticketsRichiesti = num_biglietti || 1;

        // Recupero i dati dell'evento per controllare il limite
        const evResult = await client.execute({
          sql: "SELECT * FROM eventi WHERE id=?",
          args: [evento_id],
        });

        if (evResult.rows.length === 0) {
          return res.status(404).json({ error: "Evento non trovato" });
        }

        const evento = convertBigIntToNumber(evResult.rows[0]);

        // Controllo disponibilità per num_max
        if (evento.num_max && evento.num_max > 0) {
          const countResult = await client.execute({
            sql: "SELECT SUM(num_partecipanti) as totale FROM prenotazioni_eventi WHERE evento_id = ?",
            args: [evento_id],
          });

          const totaleAttuale =
            convertBigIntToNumber(countResult.rows[0].totale) || 0;

          if (totaleAttuale + ticketsRichiesti > evento.num_max) {
            const disponibili = evento.num_max - totaleAttuale;
            const messaggioErrore =
              disponibili > 0
                ? `Ci dispiace, sono rimasti solo ${disponibili} posti disponibili.`
                : "L'evento ha raggiunto il limite massimo di partecipanti.";

            return res.status(400).json({ error: messaggioErrore });
          }
        }

        const result = await client.execute({
          sql: `INSERT INTO prenotazioni_eventi (evento_id, nome, cognome, email, num_partecipanti, note, data_prenotazione) 
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          args: [
            evento_id,
            nome,
            cognome,
            email.toLowerCase().trim(),
            ticketsRichiesti,
            note || "",
          ],
        });

        const insertId = convertBigIntToNumber(result.lastInsertRowid);
        const pData = { nome, cognome, num_partecipanti: ticketsRichiesti };
        const htmlConfirm = createConfirmationTemplate(pData, evento);

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

      // CREAZIONE EVENTO
      const {
        titolo,
        descrizione,
        data_evento,
        immagine_url,
        immagine_blob,
        immagine_tipo,
        immagine_nome,
        num_max,
      } = req.body;

      let blobBuffer = null;
      if (immagine_blob) {
        const base64Data = immagine_blob.split(";base64,").pop();
        blobBuffer = Buffer.from(base64Data, "base64");
      }

      const result = await client.execute({
        sql: `INSERT INTO eventi (titolo, descrizione, data_evento, immagine_url, immagine_blob, immagine_tipo, immagine_nome, visibile, num_max) 
              VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        args: [
          titolo,
          descrizione || "",
          data_evento,
          immagine_url || "",
          blobBuffer,
          immagine_tipo || "",
          immagine_nome || "",
          num_max || 0,
        ],
      });

      return res.status(201).json({
        success: true,
        id: convertBigIntToNumber(result.lastInsertRowid),
      });
    }

    // --- PUT ---
    if (req.method === "PUT") {
      if (section === "checkin") {
        const { id, num_arrivati } = req.body;
        await client.execute({
          sql: "UPDATE prenotazioni_eventi SET num_arrivati = ? WHERE id = ?",
          args: [num_arrivati, id],
        });
        return res.status(200).json({ success: true });
      }

      if (section === "visibility") {
        const { id, visibile } = req.body;
        await client.execute({
          sql: "UPDATE eventi SET visibile = ? WHERE id = ?",
          args: [visibile, id],
        });
        return res.status(200).json({ success: true });
      }

      // Modifica Evento
      const {
        id,
        titolo,
        descrizione,
        data_evento,
        immagine_url,
        immagine_blob,
        immagine_tipo,
        immagine_nome,
        num_max,
      } = req.body;

      let sql = `UPDATE eventi SET titolo=?, descrizione=?, data_evento=?, immagine_url=?, num_max=?`;
      let args = [titolo, descrizione, data_evento, immagine_url, num_max || 0];

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
