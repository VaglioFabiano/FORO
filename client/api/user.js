import { createClient } from "@libsql/client/web";
import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai"; // Importiamo Gemini

// --- Configurazione Database (CODICE ORIGINALE) ---
const config = {
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
};

console.log("Configurazione database:", {
  hasUrl: !!config.url,
  hasToken: !!config.authToken,
  urlLength: config.url?.length || 0,
  tokenLength: config.authToken?.length || 0,
});

// Inizializziamo il client fuori per renderlo accessibile
let client = null;

// Gestione errore se mancano le variabili, ma senza bloccare l'import se serve solo la chat
if (!config.url || !config.authToken) {
  console.error("Mancano le variabili d'ambiente per il DB!");
  // Non lanciamo errore bloccante qui per permettere alla chat di funzionare anche senza DB
  // Ma le funzioni DB falliranno se chiamate.
} else {
  client = createClient(config);
  console.log("Client database creato con successo");
}

// --- Funzione Helper Hashing (CODICE ORIGINALE) ---
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

// --- ⬇️ NUOVE FUNZIONI PER CHAT STILISTA (GEMINI + FALLBACK) ⬇️ ---

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
 * Gestisce la logica della chat:
 * 1. Prova Google Gemini (Veloce/Gratis)
 * 2. Se fallisce, usa OpenRouter (Vecchio metodo lento ma funzionante)
 */
async function handleChatStilista(req, res) {
  console.log("Esecuzione di handleChatStilista...");

  const { history, userPrompt, colors } = req.body;
  if (!userPrompt) {
    return res
      .status(400)
      .json({ success: false, error: "Messaggio utente mancante" });
  }

  // --- Preparazione contesto (comune a entrambi) ---
  let colorContext = "";
  let colorHexListStr = "";
  if (colors && colors.length > 0) {
    colorHexListStr = colors.map((c) => rgbToHex(c.r, c.g, c.b)).join(", ");
    // Formattazione per il prompt
    colorContext = `[Ho questi colori: ${colorHexListStr}] `;
  }

  // --- TENTATIVO 1: GOOGLE GEMINI ---
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log("🚀 Tento con Gemini...");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite-preview-02-05",
        systemInstruction:
          "Sei Heidi, una consulente di stile esperta, amichevole ed empatica. Aiuti le persone comuni ad abbinare i vestiti. Rispondi in italiano, sii concisa e usa emoji.",
      });

      // Converti history per Gemini
      const chatHistory = Array.isArray(history)
        ? history.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          }))
        : [];

      const chat = model.startChat({ history: chatHistory });
      const finalPrompt = `${colorContext}${userPrompt}`;

      const result = await chat.sendMessage(finalPrompt);
      const response = await result.response;
      const text = response.text();

      return res.status(200).json({
        choices: [{ message: { role: "assistant", content: text } }],
      });
    } catch (geminiError) {
      console.error("⚠️ Gemini ha fallito:", geminiError.message);
      console.log("🔄 Passo al fallback (OpenRouter)...");
      // Non ritorniamo errore, lasciamo scorrere il codice verso OpenRouter
    }
  }

  // --- TENTATIVO 2: OPENROUTER (CODICE ORIGINALE RIPRISTINATO COME FALLBACK) ---
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY non è impostata!");
      // Se anche questo manca/fallisce, diamo errore
      return res
        .status(500)
        .json({
          success: false,
          error: "Configurazione AI mancante (Né Gemini né OpenRouter).",
        });
    }

    const systemPrompt =
      "Sei uno stilista professionista e il tuo compito è aiutare persone comuni ad abbinare i vestiti in modo semplice ed elegante. Se pensi che due colori non si abbinino, sottolinea che è un abbianamento audace e consiglia delle alternative. Rispondi in italiano.";

    const messages = [{ role: "system", content: systemPrompt }];

    if (history && Array.isArray(history)) {
      messages.push(...history);
    }

    // Logica originale per invio colori solo al primo messaggio
    let finalUserPrompt = userPrompt;
    if (history.length === 0 && colorContext) {
      finalUserPrompt = `${colorContext} ${userPrompt}`;
    } else if (colorContext) {
      // Se vuoi reinviare i colori anche dopo, scommenta sotto, altrimenti lascia logica originale
      // finalUserPrompt = `${colorContext} ${userPrompt}`;
    }

    messages.push({ role: "user", content: finalUserPrompt });

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tngtech/deepseek-r1t2-chimera:free", // O il modello che preferisci
          messages: messages,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Errore da OpenRouter:", errorData);
      return res.status(response.status).json({
        success: false,
        error: "Errore dal servizio IA (Fallback)",
        details: errorData,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Errore in handleChatStilista (Fallback):", error);
    return res
      .status(500)
      .json({ success: false, error: "Errore interno del server (chat)" });
  }
}

// --- ⬆️ FINE NUOVE FUNZIONI ⬆️ ---

// --- Funzioni CRUD Utenti (CODICE ORIGINALE RESTAURATO) ---

// Handler per creare un nuovo utente (POST)
async function createUser(req, res) {
  try {
    if (!client) throw new Error("Database non connesso");
    const { name, surname, username, tel, level, password } = req.body; // Validazione input

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
    } // Validazione username univoco

    const existingUsername = await client.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username.trim()],
    });

    if (existingUsername.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Username già registrato",
      });
    } // Validazione telefono univoco

    const existingTel = await client.execute({
      sql: "SELECT id FROM users WHERE tel = ?",
      args: [tel.trim()],
    });

    if (existingTel.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Telefono già registrato",
      });
    } // Creazione utente - usa username come salt

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
    if (!client) throw new Error("Database non connesso");
    console.log("Tentativo di recupero utenti...");
    const result = await client.execute("SELECT * FROM users");
    console.log("Query eseguita, numero righe:", result.rows.length);
    if (result.rows.length > 0) {
      console.log("Prima riga:", JSON.stringify(result.rows[0], null, 2));
    }

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

    console.log("Utenti trasformati:", users.length);

    return res.status(200).json({
      success: true,
      users: users,
      count: users.length,
    });
  } catch (error) {
    console.error("Errore dettagliato nel recupero utenti:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
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
    if (!client) throw new Error("Database non connesso");
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
    } // Verifica esistenza utente

    const targetUser = await client.execute({
      sql: "SELECT id, level, username, tel FROM users WHERE id = ?",
      args: [id],
    });

    if (targetUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Utente non trovato",
      });
    } // Verifica username univoco (solo se è diverso da quello attuale)

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
    } // Verifica telefono univoco (solo se è diverso da quello attuale)

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
    } // Costruzione query dinamica

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
      const salt = username.trim(); // Usa il nuovo username come salt
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
    console.error("Errore nell'aggiornamento utente:", error);
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
    if (!client) throw new Error("Database non connesso");
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
    console.error("Errore nell'eliminazione utente:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

// --- HANDLER PRINCIPALE (MODIFICATO PER SMISTARE TRA CHAT E UTENTI) ---
export default async function handler(req, res) {
  console.log(`API /user chiamata con metodo: ${req.method}`); // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // --- ⬇️ SMISTAMENTO RICHIESTE ⬇️ ---
  // Controlliamo se è una richiesta POST per la chat.
  // Lo facciamo prima di tentare la connessione al DB, perché la chat non ne ha bisogno.
  if (req.method === "POST" && req.body.action === "chatStilista") {
    console.log("Handling POST request for [chatStilista]...");
    return await handleChatStilista(req, res);
  }
  // --- ⬆️ FINE SMISTAMENTO ⬆️ ---

  // Se non è una richiesta di chat, prosegue con la normale logica di gestione UTENTI
  try {
    // Test connessione DB
    console.log("Testing database connection for user management...");
    if (!client)
      throw new Error("Configurazione DB mancante o connessione fallita");

    const testResult = await client.execute("SELECT 1 as test");
    console.log("Database connection successful:", testResult);

    switch (req.method) {
      case "GET":
        console.log("Handling GET request for [getUsers]...");
        return await getUsers(req, res);
      case "POST":
        // Arriva qui solo se 'action' NON è 'chatStilista'
        console.log("Handling POST request for [createUser]...");
        return await createUser(req, res);
      case "PUT":
        console.log("Handling PUT request for [updateUser]...");
        return await updateUser(req, res);
      case "DELETE":
        console.log("Handling DELETE request for [deleteUser]...");
        return await deleteUser(req, res);
      default:
        console.log(`Metodo non supportato: ${req.method}`);
        return res.status(405).json({
          success: false,
          error: "Metodo non supportato",
        });
    }
  } catch (error) {
    console.error("Errore API dettagliato (DB or main handler):", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    return res.status(500).json({
      success: false,
      error: "Errore interno del server",
      details: error.message,
      debugInfo:
        process.env.NODE_ENV === "development"
          ? {
              stack: error.stack,
              name: error.name,
              code: error.code,
            }
          : undefined,
    });
  }
}
