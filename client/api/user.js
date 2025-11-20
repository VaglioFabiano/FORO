import { createClient } from "@libsql/client/web";
import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Configurazione Database ---
const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
};

// Log di debug per la configurazione (senza esporre i segreti)
console.log("Configurazione database:", {
  hasUrl: !!config.url,
  hasToken: !!config.authToken,
});

if (!config.url || !config.authToken) {
  console.error("Mancano le variabili d'ambiente per il DB!");
  throw new Error("Configurazione database mancante");
}

const client = createClient(config);

// --- Funzione Helper Hashing ---
function hashPassword(password, salt) {
  try {
    return crypto
      .pbkdf2Sync(password, salt, 10000, 64, "sha512")
      .toString("hex");
  } catch (error) {
    console.error("Errore durante l'hashing della password:", error);
    throw new Error("Errore nella generazione della password");
  }
}

/**
 * Funzione helper per convertire RGB in HEX
 */
function rgbToHex(r, g, b) {
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
}

/**
 * Gestisce la logica della chat con Google Gemini
 */
async function handleChatStilista(req, res) {
  console.log("Esecuzione di handleChatStilista (Gemini)...");
  try {
    // 1. Inizializza il client Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY non è impostata!");
      return res
        .status(500)
        .json({ success: false, error: "Configurazione server errata." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // 2. Estrai i dati dal frontend
    const { history, userPrompt, colors } = req.body;

    if (!userPrompt) {
      return res
        .status(400)
        .json({ success: false, error: "Messaggio utente mancante" });
    }

    // 3. Configura il modello e le istruzioni di sistema
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite-preview-02-05", // Modello richiesto
      systemInstruction:
        "Sei Heidi, una consulente di stile esperta, amichevole ed empatica. Il tuo compito è aiutare persone comuni ad abbinare i vestiti in modo semplice ed elegante. Se pensi che due colori non si abbinino, sottolinea che è un abbinamento audace e consiglia delle alternative. Rispondi in italiano, sii concisa e usa qualche emoji.",
    });

    // 4. Prepara il contesto dei colori
    let colorContext = "";
    if (colors && colors.length > 0) {
      const colorHexList = colors
        .map((c) => `${rgbToHex(c.r, c.g, c.b)} (RGB: ${c.r},${c.g},${c.b})`)
        .join(", ");
      colorContext = `[L'utente ha campionato questi colori dalla fotocamera: ${colorHexList}] `;
    }

    // 5. Converti la cronologia nel formato Gemini (user/model)
    // Il frontend manda 'assistant', Gemini vuole 'model'
    const chatHistory = Array.isArray(history)
      ? history.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        }))
      : [];

    // 6. Avvia la chat
    const chat = model.startChat({
      history: chatHistory,
    });

    // 7. Invia il messaggio (combinando contesto colori e prompt utente)
    const finalPrompt = `${colorContext}${userPrompt}`;
    console.log("Invio a Gemini:", finalPrompt);

    const result = await chat.sendMessage(finalPrompt);
    const response = await result.response;
    const text = response.text();

    // 8. Formatta la risposta come se fosse OpenAI (per compatibilità Frontend)
    // Il frontend si aspetta data.choices[0].message.content
    return res.status(200).json({
      choices: [
        {
          message: {
            role: "assistant",
            content: text,
          },
        },
      ],
    });
  } catch (error) {
    console.error("Errore in handleChatStilista:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server (Gemini)",
      details: error.message,
    });
  }
}

// Handler per creare un nuovo utente (POST)
async function createUser(req, res) {
  try {
    const { name, surname, username, tel, level, password } = req.body;

    if (
      !name?.trim() ||
      !surname?.trim() ||
      !username?.trim() ||
      !tel?.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        error: "Tutti i campi sono obbligatori",
      });
    }

    const levelNum = parseInt(level);
    if (isNaN(levelNum)) {
      return res.status(400).json({
        success: false,
        error: "Livello non valido",
      });
    }

    const existingUsername = await client.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username.trim()],
    });

    if (existingUsername.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Username già registrato",
      });
    }

    const existingTel = await client.execute({
      sql: "SELECT id FROM users WHERE tel = ?",
      args: [tel.trim()],
    });

    if (existingTel.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Telefono già registrato",
      });
    }

    const salt = username.trim();
    const passwordHash = hashPassword(password, salt);

    const result = await client.execute({
      sql: `INSERT INTO users (name, surname, username, tel, level, password_hash, salt)
            VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id, name, surname, username, tel, level, created_at`,
      args: [
        name.trim(),
        surname.trim(),
        username.trim(),
        tel.trim(),
        levelNum,
        passwordHash,
        salt,
      ],
    });

    return res.status(201).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Errore nella creazione utente:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

// Handler per ottenere tutti gli utenti (GET)
async function getUsers(req, res) {
  try {
    const result = await client.execute("SELECT * FROM users");

    const users = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      surname: row.surname,
      username: row.username,
      tel: row.tel,
      level: row.level,
      created_at: row.created_at,
      last_login: row.last_login,
      telegram_chat_id: row.telegram_chat_id,
    }));

    return res.status(200).json({
      success: true,
      users: users,
      count: users.length,
    });
  } catch (error) {
    console.error("Errore recupero utenti:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
      details: error.message,
    });
  }
}

// Handler per aggiornare un utente (PUT)
async function updateUser(req, res) {
  try {
    const { id, name, surname, username, tel, level, password } = req.body;

    if (
      !id ||
      !name?.trim() ||
      !surname?.trim() ||
      !username?.trim() ||
      !tel?.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Dati mancanti",
      });
    }

    const levelNum = parseInt(level);
    if (isNaN(levelNum)) {
      return res.status(400).json({
        success: false,
        error: "Livello non valido",
      });
    }

    const targetUser = await client.execute({
      sql: "SELECT id, level, username, tel FROM users WHERE id = ?",
      args: [id],
    });

    if (targetUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Utente non trovato",
      });
    }

    if (username.trim() !== targetUser.rows[0].username) {
      const usernameCheck = await client.execute({
        sql: "SELECT id FROM users WHERE username = ? AND id != ?",
        args: [username.trim(), id],
      });

      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Username già registrato",
        });
      }
    }

    if (tel.trim() !== targetUser.rows[0].tel) {
      const telCheck = await client.execute({
        sql: "SELECT id FROM users WHERE tel = ? AND id != ?",
        args: [tel.trim(), id],
      });

      if (telCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Telefono già registrato",
        });
      }
    }

    let updateSql =
      "UPDATE users SET name = ?, surname = ?, username = ?, tel = ?, level = ?";
    const updateArgs = [
      name.trim(),
      surname.trim(),
      username.trim(),
      tel.trim(),
      levelNum,
    ];

    if (password?.trim()) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: "Password troppo corta (minimo 6 caratteri)",
        });
      }
      const salt = username.trim();
      const passwordHash = hashPassword(password, salt);
      updateSql += ", password_hash = ?, salt = ?";
      updateArgs.push(passwordHash, salt);
    }

    updateSql += " WHERE id = ? RETURNING *";
    updateArgs.push(id);

    const result = await client.execute({
      sql: updateSql,
      args: updateArgs,
    });

    return res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Errore aggiornamento utente:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

// Handler per eliminare un utente (DELETE)
async function deleteUser(req, res) {
  try {
    const id = req.query.id || req.body.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID utente mancante",
      });
    }

    const result = await client.execute({
      sql: "DELETE FROM users WHERE id = ? RETURNING id, name, surname",
      args: [id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Utente non trovato",
      });
    }

    return res.status(200).json({
      success: true,
      deletedUser: result.rows[0],
      message: "Utente eliminato con successo",
    });
  } catch (error) {
    console.error("Errore eliminazione utente:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

// --- HANDLER PRINCIPALE ---
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // --- SMISTAMENTO RICHIESTE ---
  // Se è una richiesta per la chat, NON connetterti al DB
  if (req.method === "POST" && req.body.action === "chatStilista") {
    return await handleChatStilista(req, res);
  }

  // Altrimenti gestisci le operazioni Utente/DB
  try {
    switch (req.method) {
      case "GET":
        return await getUsers(req, res);
      case "POST":
        return await createUser(req, res);
      case "PUT":
        return await updateUser(req, res);
      case "DELETE":
        return await deleteUser(req, res);
      default:
        return res.status(405).json({
          success: false,
          error: "Metodo non supportato",
        });
    }
  } catch (error) {
    console.error("Errore Handler Principale:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
      details: error.message,
    });
  }
}
