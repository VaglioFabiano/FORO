/**
 * /api/telegram — canale, classi di notifica e debug del bot (BACKEND.md §11).
 * Ex telegram-ultimi.js, send-telegram.js, notifiche-telegram.js, telegram-reset-chatid.js.
 *   GET  ?action=ultimi&n=&canale=   ultimi post del canale pubblico (cache CDN 5 min)          pubblico
 *   GET  ?action=classi              iscrizioni raggruppate per classe (tabella notifiche)       livello ≤ 2
 *   POST ?action=iscrivi             { userId, classe, descrizione } → messaggio alla persona    livello ≤ 2
 *   POST ?action=togli               { userId, classe }              → messaggio alla persona    livello ≤ 2
 *   GET  ?action=debug               bot, ultimi 10 update (getUpdates offset=-10), chat id salvato   livello 0
 *   POST ?action=prova               { messaggio } → a sé stessi tramite il proprio numero      livello 0
 *   POST ?action=reset_chat          il proprio chat id torna NULL                               livello 0
 *   POST ?action=imposta_chat        { userId, chatId | null }                                   livello 0
 * Niente webhook: con un webhook attivo getUpdates resterebbe vuoto. Niente invii a chat id liberi.
 */
import { db, funzione, corpo, query, righe, riga, Errore, testo, intero, json } from "./_db.js";
import { richiedi } from "./_auth.js";
import { TELEGRAM_API, inviaTelegram, provaTelegram } from "./_telegram.js";

/* ───────── canale pubblico (ex telegram-ultimi.js) ───────── */
const CANALE = "aulastudioforo";
const NOME_CANALE = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;

async function ultimiPost(n, canale) {
  const r = await fetch(`https://t.me/s/${canale}`, { headers: { "accept-language": "it" } });
  if (!r.ok) throw new Error(`t.me ha risposto ${r.status}`);
  const html = await r.text();
  const ids = [];
  for (const m of html.matchAll(/<div class="tgme_widget_message ([^"]*)"[^>]*data-post="[^"/]+\/(\d+)"/g)) {
    if (!m[1].includes("service_message")) ids.push(Number(m[2]));
  }
  return [...new Set(ids)].sort((a, b) => b - a).slice(0, n);
}

async function ultimi(q, res) {
  const n = Math.min(Math.max(Number(q.n) || 3, 1), 10);
  if (q.canale && !NOME_CANALE.test(q.canale)) throw new Errore(400, "Nome del canale non valido");
  const canale = q.canale || CANALE;
  try {
    const post = await ultimiPost(n, canale);
    res.setHeader("cache-control", "public, s-maxage=300, stale-while-revalidate=600");
    return json(res, 200, { canale, post });
  } catch {
    res.setHeader("cache-control", "no-store");
    return json(res, 502, { message: "Canale Telegram non raggiungibile" });
  }
}

/* ───────── classi di notifica (ex notifiche-telegram.js) ───────── */
async function classi() {
  const rs = await db.execute(`SELECT n.id, n.user_id, n.tipo_notifica, n.descrizione, n.creato_il, u.name, u.surname
                               FROM notifiche n LEFT JOIN users u ON n.user_id = u.id ORDER BY n.tipo_notifica, u.surname`);
  return {
    iscrizioni: righe(rs).map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      classe: r.tipo_notifica ?? "promemoria",
      descrizione: r.descrizione ?? "",
      nome: r.name ?? "",
      cognome: r.surname ?? "",
    })),
  };
}

/** come sendGroupNotification di client/api/notifiche-telegram.js (testo semplice, senza HTML) */
async function avvisaClasse(azione, classe, chi, destinatarioId) {
  const se = Number(chi.id) === Number(destinatarioId);
  const autore = `${chi.name} ${chi.surname}`;
  const msg =
    azione === "add"
      ? se
        ? `✅ Ti sei iscritto al gruppo di notifica: "${classe}"`
        : `📋 ${autore} ti ha aggiunto al gruppo di notifica: "${classe}"`
      : se
        ? `❌ Ti sei disiscritto dal gruppo di notifica: "${classe}"`
        : `🗑️ ${autore} ti ha rimosso dal gruppo di notifica: "${classe}"`;
  const d = riga(await db.execute({ sql: "SELECT telegram_chat_id FROM users WHERE id = ?", args: [destinatarioId] }));
  await provaTelegram(d?.telegram_chat_id, msg, { html: false });
}

function nomeClasse(s) {
  // nomi liberi in minuscolo, come oggi
  const c = testo(s).toLowerCase();
  if (!/^[a-z0-9_]{2,40}$/.test(c)) throw new Errore(400, "Il nome della classe usa solo lettere minuscole, numeri e _.", "classe");
  return c;
}

async function iscrivi(u, b) {
  const userId = intero(b.userId);
  const classe = nomeClasse(b.classe);
  const p = riga(await db.execute({ sql: "SELECT id FROM users WHERE id = ?", args: [userId] }));
  if (!p) throw new Errore(404, "Questa persona non c'è più.");
  const rs = await db.execute({
    // la descrizione è della classe: se non arriva si riprende quella degli altri iscritti
    sql: `INSERT OR IGNORE INTO notifiche (user_id, tipo_notifica, descrizione)
          VALUES (?1, ?2, COALESCE(NULLIF(?3, ''), (SELECT descrizione FROM notifiche WHERE tipo_notifica = ?2 AND descrizione <> '' LIMIT 1), ''))`,
    args: [userId, classe, testo(b.descrizione)],
  });
  if (rs.rowsAffected) await avvisaClasse("add", classe, u, userId);
  return classi();
}

async function togli(u, b) {
  const userId = intero(b.userId);
  const classe = testo(b.classe);
  const rs = await db.execute({ sql: "DELETE FROM notifiche WHERE user_id = ? AND tipo_notifica = ?", args: [userId, classe] });
  if (rs.rowsAffected) await avvisaClasse("remove", classe, u, userId);
  return classi();
}

/* ───────── debug (livello 0): come client/src/dashboard/TelegramSender.tsx ───────── */
async function debug(u) {
  let bot = { ok: false };
  let updates = { ok: false, result: [] };
  try {
    bot = await (await fetch(`${TELEGRAM_API}/getMe`)).json();
  } catch (e) {
    console.error("Telegram getMe:", e.message);
  }
  try {
    updates = await (await fetch(`${TELEGRAM_API}/getUpdates?limit=10&offset=-10`)).json();
  } catch (e) {
    console.error("Telegram getUpdates:", e.message);
  }
  return {
    user: { id: Number(u.id), name: u.name, surname: u.surname, tel: u.tel, level: Number(u.level) },
    bot: { info: bot.ok ? bot.result : "Errore API Telegram", username: bot.ok ? bot.result.username : null },
    database: { savedChatId: u.telegram_chat_id != null ? String(u.telegram_chat_id) : null },
    telegram: {
      updatesCount: updates.ok ? updates.result.length : 0,
      lastUpdates: updates.ok
        ? updates.result.map((x) => ({
            updateId: x.update_id,
            messageId: x.message?.message_id,
            chatId: x.message?.chat?.id,
            chatType: x.message?.chat?.type,
            text: x.message?.text || (x.message?.contact ? "Contact" : "Media"),
            contactPhone: x.message?.contact?.phone_number ?? null,
            from: x.message?.from || {},
            date: x.message?.date ? new Date(x.message.date * 1000).toISOString() : null,
          }))
        : [],
    },
  };
}

/** come getChatIdByPhone di client/api/send-telegram.js: il chat id salvato, altrimenti il contatto condiviso col bot */
async function chatDaTelefono(tel) {
  const c = riga(await db.execute({ sql: "SELECT telegram_chat_id FROM users WHERE tel = ? AND telegram_chat_id IS NOT NULL", args: [tel] }));
  if (c) return c.telegram_chat_id;
  const data = await (await fetch(`${TELEGRAM_API}/getUpdates?limit=100&offset=-100`)).json();
  if (!data.ok) return null;
  const cerca = tel.replace(/[^\d+]/g, "");
  for (const x of data.result.reverse()) {
    const ct = x.message?.contact;
    if (!ct) continue;
    const n = ct.phone_number.replace(/[^\d+]/g, "");
    if (n === cerca || n.slice(-8) === cerca.slice(-8)) {
      await db.execute({ sql: "UPDATE users SET telegram_chat_id = ? WHERE tel = ?", args: [x.message.chat.id, tel] });
      return x.message.chat.id;
    }
  }
  return null;
}

async function prova(u, b) {
  const messaggio = testo(b.messaggio);
  if (!messaggio) throw new Errore(400, "Messaggio vuoto", "messaggio");
  const chatId = await chatDaTelefono(u.tel);
  if (!chatId) throw new Errore(404, "Chat non trovata. Condividi contatto col bot.");
  const log = (ok, id, err) =>
    db
      .execute({
        sql: `INSERT INTO telegram_messages (user_id, phone_number, message, success, telegram_message_id, error_message, created_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [u.id, u.tel, messaggio, ok ? 1 : 0, id, err],
      })
      .catch((e) => console.error("Log Telegram:", e.message));
  try {
    const r = await inviaTelegram(chatId, messaggio);
    await log(true, r.message_id, null);
    return { success: true, messageId: r.message_id };
  } catch (e) {
    await log(false, null, e.message);
    throw new Errore(502, e.message);
  }
}

async function impostaChat(b) {
  const userId = intero(b.userId);
  const p = riga(await db.execute({ sql: "SELECT id, name, surname FROM users WHERE id = ?", args: [userId] }));
  if (!p) throw new Errore(404, "Questa persona non c'è più.", "userId");
  if (b.chatId === null || b.chatId === "") {
    await db.execute({ sql: "UPDATE users SET telegram_chat_id = NULL WHERE id = ?", args: [userId] });
    return { ok: true, chatId: null };
  }
  const chat = String(b.chatId).trim();
  if (!/^-?\d{1,15}$/.test(chat)) throw new Errore(400, "Il Chat ID è un numero intero.", "chatId");
  const altro = riga(await db.execute({ sql: "SELECT name, surname FROM users WHERE telegram_chat_id = ? AND id <> ? LIMIT 1", args: [Number(chat), userId] }));
  if (altro) throw new Errore(409, `Questo Chat ID è già di ${altro.name} ${altro.surname}.`, "chatId");
  // il bot non scrive nulla alla persona (decisione 2026-10-11)
  await db.execute({ sql: "UPDATE users SET telegram_chat_id = ? WHERE id = ?", args: [Number(chat), userId] });
  return { ok: true, chatId: chat };
}

async function statoChat() {
  const rs = await db.execute("SELECT id, name, surname, telegram_chat_id FROM users ORDER BY surname COLLATE NOCASE, name COLLATE NOCASE");
  return {
    utenti: righe(rs).map((r) => ({ id: Number(r.id), nome: r.name, cognome: r.surname, chatId: r.telegram_chat_id != null ? String(r.telegram_chat_id) : null })),
  };
}

export default funzione(async (req, res) => {
  const q = query(req);
  const b = corpo(req);
  if (req.method === "GET" && q.action === "ultimi") return ultimi(q, res);
  if (q.action === "classi" || q.action === "iscrivi" || q.action === "togli") {
    const u = await richiedi(req, 2);
    if (req.method === "GET" && q.action === "classi") return classi();
    if (req.method === "POST" && q.action === "iscrivi") return iscrivi(u, b);
    if (req.method === "POST" && q.action === "togli") return togli(u, b);
  }
  const u = await richiedi(req, 0);
  if (req.method === "GET" && q.action === "debug") return debug(u);
  if (req.method === "GET" && q.action === "chat") return statoChat();
  if (req.method === "POST" && q.action === "prova") return prova(u, b);
  if (req.method === "POST" && q.action === "reset_chat") {
    await db.execute({ sql: "UPDATE users SET telegram_chat_id = NULL WHERE id = ?", args: [u.id] });
    return { success: true, message: "Chat ID cancellato. Ora dovrai condividere nuovamente il tuo contatto con il bot." };
  }
  if (req.method === "POST" && q.action === "imposta_chat") return impostaChat(b);
  throw new Errore(404, "Richiesta non riconosciuta.");
});
