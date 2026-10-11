/**
 * /api/autenticazione — accesso, profilo e preferenze (BACKEND.md §7).
 *   POST ?action=login      { username, password, ricordami }  → { token, scade, utente }
 *   POST ?action=logout     (la sessione è nel browser: niente da cancellare sul server)
 *   POST ?action=scambia    Bearer "userId:hmac" del vecchio sito → { token, scade, utente }
 *   GET  ?action=me         → { utente }
 *   PUT  ?action=profilo    { nome, cognome, username, telefono } → { utente }
 *   PUT  ?action=password   { attuale, nuova }
 *   PUT  ?action=preferenze { promemoria, presenze, report } → { utente }
 */
import { db, funzione, corpo, query, riga, Errore, testo } from "./_db.js";
import {
  COLONNE_UTENTE,
  bearer,
  creaToken,
  hashPassword,
  nuovoSale,
  passwordGiusta,
  richiedi,
  utentePubblico,
  verificaTokenVecchio,
} from "./_auth.js";
import { provaTelegram } from "./_telegram.js";

const CLASSE_REPORT = "gestione_turni";

async function haReport(id) {
  const r = await db.execute({ sql: "SELECT 1 FROM notifiche WHERE user_id = ? AND tipo_notifica = ? LIMIT 1", args: [id, CLASSE_REPORT] });
  return r.rows.length > 0;
}
async function rileggi(id) {
  const u = riga(await db.execute({ sql: `SELECT ${COLONNE_UTENTE} FROM users WHERE id = ?`, args: [id] }));
  return utentePubblico(u, await haReport(id));
}

async function login(b) {
  // username esatto com'è digitato, password senza trim: come client/api/autenticazione.js
  const username = typeof b.username === "string" ? b.username : "";
  const password = typeof b.password === "string" ? b.password : "";
  if (!username || !password) throw new Errore(400, "Scrivi username e password.");
  const u = riga(
    await db.execute({ sql: `SELECT ${COLONNE_UTENTE}, password_hash, salt FROM users WHERE username = ? LIMIT 1`, args: [username] }),
  );
  if (!u || !passwordGiusta(password, u.salt, u.password_hash))
    throw new Errore(401, "Username o password non corretti. Controlla e riprova.");
  await db.execute({ sql: "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", args: [u.id] });
  const { token, scade } = creaToken(u.id, !!b.ricordami);
  return { token, scade, utente: utentePubblico(u, await haReport(u.id)) };
}

async function scambia(req, b) {
  const id = verificaTokenVecchio(bearer(req));
  if (id === null) throw new Errore(401, "La sessione è scaduta: accedi di nuovo.");
  const u = riga(await db.execute({ sql: `SELECT ${COLONNE_UTENTE} FROM users WHERE id = ?`, args: [id] }));
  if (!u) throw new Errore(401, "La sessione è scaduta: accedi di nuovo.");
  const { token, scade } = creaToken(u.id, !!b.ricordami);
  return { token, scade, utente: utentePubblico(u, await haReport(u.id)) };
}

async function profilo(u, b) {
  const nome = testo(b.nome);
  const cognome = testo(b.cognome);
  const username = testo(b.username);
  const telefono = testo(b.telefono);
  if (!nome) throw new Errore(400, "Scrivi il tuo nome.", "nome");
  if (!cognome) throw new Errore(400, "Scrivi il tuo cognome.", "cognome");
  if (!username) throw new Errore(400, "Scrivi uno username.", "username");
  if (!telefono) throw new Errore(400, "Il telefono serve: lo usa anche il bot Telegram.", "telefono");
  // il formato si controlla solo se cambia: i numeri già salvati restano come sono
  if (telefono !== u.tel && !/^\d{6,15}$/.test(telefono))
    throw new Errore(400, "Scrivi il telefono con le sole cifre, senza spazi.", "telefono");
  const dup = await db.execute({
    sql: "SELECT (SELECT 1 FROM users WHERE username = ?1 AND id <> ?3 LIMIT 1) AS u, (SELECT 1 FROM users WHERE tel = ?2 AND id <> ?3 LIMIT 1) AS t",
    args: [username, telefono, u.id],
  });
  if (dup.rows[0].u) throw new Errore(400, "Questo username è già di un'altra persona.", "username");
  if (dup.rows[0].t) throw new Errore(400, "Questo telefono è già di un'altra persona.", "telefono");
  await db.execute({
    sql: "UPDATE users SET name = ?, surname = ?, username = ?, tel = ? WHERE id = ?",
    args: [nome, cognome, username, telefono, u.id],
  });
  return { utente: await rileggi(u.id) };
}

async function password(u, b) {
  const attuale = typeof b.attuale === "string" ? b.attuale : "";
  const nuova = typeof b.nuova === "string" ? b.nuova : "";
  const r = riga(await db.execute({ sql: "SELECT password_hash, salt FROM users WHERE id = ?", args: [u.id] }));
  if (!r || !passwordGiusta(attuale, r.salt, r.password_hash)) throw new Errore(400, "La password attuale non è corretta.", "attuale");
  if (nuova.length < 6) throw new Errore(400, "La nuova password deve avere almeno 6 caratteri.", "nuova");
  const sale = nuovoSale();
  await db.execute({ sql: "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", args: [hashPassword(nuova, sale), sale, u.id] });
  return { ok: true };
}

async function preferenze(u, b) {
  const stmts = [
    {
      sql: "UPDATE users SET pref_promemoria = ?, pref_presenze = ? WHERE id = ?",
      args: [b.promemoria === false ? 0 : 1, b.presenze === false ? 0 : 1, u.id],
    },
  ];
  const prima = await haReport(u.id);
  const dopo = !!b.report;
  if (dopo && !prima)
    stmts.push({
      // la descrizione della classe è la stessa degli altri iscritti
      sql: `INSERT OR IGNORE INTO notifiche (user_id, tipo_notifica, descrizione)
            VALUES (?1, ?2, COALESCE((SELECT descrizione FROM notifiche WHERE tipo_notifica = ?2 AND descrizione <> '' LIMIT 1), ''))`,
      args: [u.id, CLASSE_REPORT],
    });
  if (!dopo && prima) stmts.push({ sql: "DELETE FROM notifiche WHERE user_id = ? AND tipo_notifica = ?", args: [u.id, CLASSE_REPORT] });
  await db.batch(stmts, "write");
  // come oggi: chi si iscrive o si toglie da una classe riceve un messaggio dal bot
  if (dopo !== prima)
    await provaTelegram(
      u.telegram_chat_id,
      dopo ? `✅ Ti sei iscritto al gruppo di notifica: "${CLASSE_REPORT}"` : `❌ Ti sei disiscritto dal gruppo di notifica: "${CLASSE_REPORT}"`,
      { html: false },
    );
  return { utente: await rileggi(u.id) };
}

export default funzione(async (req) => {
  const { action } = query(req);
  const b = corpo(req);
  if (req.method === "POST" && action === "login") return login(b);
  if (req.method === "POST" && action === "logout") return { ok: true };
  if (req.method === "POST" && action === "scambia") return scambia(req, b);
  const u = await richiedi(req, 4);
  if (req.method === "GET" && action === "me") return { utente: await rileggi(u.id) };
  if (req.method === "PUT" && action === "profilo") return profilo(u, b);
  if (req.method === "PUT" && action === "password") return password(u, b);
  if (req.method === "PUT" && action === "preferenze") return preferenze(u, b);
  throw new Errore(404, "Richiesta non riconosciuta.");
});
