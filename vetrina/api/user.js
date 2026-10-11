/**
 * /api/user — utenti del gestionale e tesserati (BACKEND.md §7, §9).
 * Utenti:
 *   GET    ?action=elenco       nomi e livelli, per turni e liste (livello ≤ 4)
 *   GET                         elenco completo con telefono e ultimo accesso (livello ≤ 1)
 *   POST                        { nome, cognome, username, telefono, livello } → { utente, password } (password provvisoria)
 *   PUT    ?action=modifica     { id, nome, cognome, username, telefono, livello }
 *   PUT    ?action=reset        { id } → { password }
 *   DELETE                      { id }
 *   Il livello 0 non si crea, non si modifica, non si elimina e non si assegna: ogni UPDATE/DELETE ha "level <> 0".
 * Tesserati (?entity=tesserato, livello ≤ 2): GET · POST · PUT · DELETE, come oggi.
 */
import { db, funzione, corpo, query, righe, riga, Errore, testo, intero } from "./_db.js";
import { richiedi, hashPassword, nuovoSale } from "./_auth.js";
import { roma } from "./_tempo.js";

/** come la vetrina: il nome senza spazi, allungato fino a 6 ripetendo l'ultima lettera (Maria → Mariaa) */
export function passwordBase(nome) {
  const n = String(nome ?? "").replace(/\s+/g, "");
  return n ? n.padEnd(6, n.slice(-1)) : "";
}
const isoUtc = (ts) => (ts ? `${String(ts).replace(" ", "T").slice(0, 19)}Z` : null);

const utenteAdmin = (r) => ({
  id: Number(r.id),
  nome: r.name ?? "",
  cognome: r.surname ?? "",
  username: r.username ?? "",
  telefono: r.tel ?? "",
  livello: Number(r.level),
  telegram: r.telegram_chat_id != null && String(r.telegram_chat_id) !== "",
  ultimoAccesso: isoUtc(r.last_login),
});

function campi(b) {
  const nome = testo(b.nome);
  const cognome = testo(b.cognome);
  const username = testo(b.username);
  const telefono = testo(b.telefono);
  const livello = intero(b.livello);
  if (!nome) throw new Errore(400, "Scrivi il nome.", "nome");
  if (!cognome) throw new Errore(400, "Scrivi il cognome.", "cognome");
  if (!username) throw new Errore(400, "Scrivi lo username.", "username");
  if (!telefono) throw new Errore(400, "Il telefono è obbligatorio: lo usa anche il bot Telegram.", "telefono");
  if (!(livello >= 1 && livello <= 4)) throw new Errore(400, "Scegli un livello da 1 a 4.", "livello");
  return { nome, cognome, username, telefono, livello };
}

async function duplicati(c, id = -1) {
  const r = await db.execute({
    sql: "SELECT (SELECT 1 FROM users WHERE username = ?1 AND id <> ?3 LIMIT 1) AS u, (SELECT 1 FROM users WHERE tel = ?2 AND id <> ?3 LIMIT 1) AS t",
    args: [c.username, c.telefono, id],
  });
  if (r.rows[0].u) throw new Errore(400, "Questo username è già usato.", "username");
  if (r.rows[0].t) throw new Errore(400, "Questo telefono è già di un'altra persona.", "telefono");
}

async function crea(b) {
  const c = campi(b);
  if (!/^\d{6,15}$/.test(c.telefono)) throw new Errore(400, "Scrivi il telefono con le sole cifre, senza spazi.", "telefono");
  await duplicati(c);
  const password = passwordBase(c.nome);
  const sale = nuovoSale();
  const r = riga(
    await db.execute({
      sql: `INSERT INTO users (name, surname, username, tel, level, password_hash, salt) VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id, name, surname, username, tel, level, telegram_chat_id, last_login`,
      args: [c.nome, c.cognome, c.username, c.telefono, c.livello, hashPassword(password, sale), sale],
    }),
  );
  return { utente: utenteAdmin(r), password };
}

async function modifica(b) {
  const id = intero(b.id);
  const c = campi(b);
  const prima = riga(await db.execute({ sql: "SELECT tel, level FROM users WHERE id = ?", args: [id] }));
  if (!prima) throw new Errore(404, "Questa persona non c'è più.");
  if (Number(prima.level) === 0) throw new Errore(403, "Il livello 0 si gestisce solo dal database.");
  if (c.telefono !== prima.tel && !/^\d{6,15}$/.test(c.telefono)) throw new Errore(400, "Scrivi il telefono con le sole cifre, senza spazi.", "telefono");
  await duplicati(c, id);
  const r = riga(
    await db.execute({
      sql: `UPDATE users SET name = ?, surname = ?, username = ?, tel = ?, level = ? WHERE id = ? AND level <> 0
            RETURNING id, name, surname, username, tel, level, telegram_chat_id, last_login`,
      args: [c.nome, c.cognome, c.username, c.telefono, c.livello, id],
    }),
  );
  if (!r) throw new Errore(403, "Il livello 0 si gestisce solo dal database.");
  return { utente: utenteAdmin(r) };
}

async function reset(b) {
  const id = intero(b.id);
  const u = riga(await db.execute({ sql: "SELECT name, level FROM users WHERE id = ?", args: [id] }));
  if (!u) throw new Errore(404, "Questa persona non c'è più.");
  if (Number(u.level) === 0) throw new Errore(403, "Il livello 0 si gestisce solo dal database.");
  const password = passwordBase(u.name);
  const sale = nuovoSale();
  await db.execute({ sql: "UPDATE users SET password_hash = ?, salt = ? WHERE id = ? AND level <> 0", args: [hashPassword(password, sale), sale, id] });
  return { password };
}

/** un solo batch, ogni istruzione con la guardia sul livello 0 (§7) */
async function elimina(me, b) {
  const id = intero(b.id);
  if (id === Number(me.id)) throw new Errore(400, "Non puoi eliminare il tuo account.");
  const u = riga(await db.execute({ sql: "SELECT level FROM users WHERE id = ?", args: [id] }));
  if (!u) throw new Errore(404, "Questa persona non c'è più.");
  if (Number(u.level) === 0) throw new Errore(403, "Il livello 0 si gestisce solo dal database.");
  const guardia = "(SELECT level FROM users WHERE id = ?1) <> 0";
  const rs = await db.batch(
    [
      { sql: `DELETE FROM turni WHERE user_id = ?1 AND data >= ?2 AND ${guardia}`, args: [id, roma().iso] },
      { sql: `UPDATE turni SET user_id = NULL WHERE user_id = ?1 AND ${guardia}`, args: [id] },
      { sql: `DELETE FROM telegram_messages WHERE user_id = ?1 AND ${guardia}`, args: [id] },
      { sql: "DELETE FROM users WHERE id = ?1 AND level <> 0", args: [id] },
    ],
    "write",
  );
  return { ok: rs[3].rowsAffected === 1 };
}

/* ───────── tesserati: come client/api/user.js ───────── */
const tesserato = (r) => ({
  id: Number(r.id),
  nome: r.nome ?? "",
  cognome: r.cognome ?? "",
  email: r.email || undefined,
  numero_di_telefono: r.numero_di_telefono || undefined,
  data_iscrizione: String(r.data_iscrizione ?? "").slice(0, 10),
});

async function tesserati(req, b) {
  if (req.method === "GET") return { tesserati: righe(await db.execute("SELECT * FROM tesserati ORDER BY id DESC")).map(tesserato) };
  if (req.method === "DELETE") {
    const r = await db.execute({ sql: "DELETE FROM tesserati WHERE id = ?", args: [intero(b.id)] });
    if (r.rowsAffected === 0) throw new Errore(404, "Tesserato non trovato.");
    return { ok: true };
  }
  const nome = testo(b.nome);
  const cognome = testo(b.cognome);
  if (!nome) throw new Errore(400, "Scrivi il nome.", "nome");
  if (!cognome) throw new Errore(400, "Scrivi il cognome.", "cognome");
  const email = testo(b.email) || null;
  const tel = testo(b.numero_di_telefono) || null;
  const id = req.method === "PUT" ? intero(b.id) : -1;
  if (email) {
    const dup = await db.execute({ sql: "SELECT 1 FROM tesserati WHERE email = ? AND id <> ? LIMIT 1", args: [email, id] });
    if (dup.rows.length) throw new Errore(400, "Email già registrata.", "email");
  }
  if (req.method === "POST") {
    const r = riga(await db.execute({ sql: "INSERT INTO tesserati (nome, cognome, email, numero_di_telefono) VALUES (?, ?, ?, ?) RETURNING *", args: [nome, cognome, email, tel] }));
    return { tesserato: tesserato(r) };
  }
  if (req.method === "PUT") {
    const r = riga(
      await db.execute({ sql: "UPDATE tesserati SET nome = ?, cognome = ?, email = ?, numero_di_telefono = ? WHERE id = ? RETURNING *", args: [nome, cognome, email, tel, id] }),
    );
    if (!r) throw new Errore(404, "Tesserato non trovato.");
    return { tesserato: tesserato(r) };
  }
  throw new Errore(404, "Richiesta non riconosciuta.");
}

export default funzione(async (req) => {
  const q = query(req);
  const b = corpo(req);
  if (q.entity === "tesserato" || b.entity === "tesserato") {
    await richiedi(req, 2);
    return tesserati(req, b);
  }
  if (req.method === "GET" && q.action === "elenco") {
    await richiedi(req, 4);
    const rs = await db.execute("SELECT id, name, surname, username, level FROM users ORDER BY surname COLLATE NOCASE, name COLLATE NOCASE");
    return { utenti: righe(rs).map((r) => ({ id: Number(r.id), nome: r.name ?? "", cognome: r.surname ?? "", username: r.username ?? "", livello: Number(r.level) })) };
  }
  const me = await richiedi(req, 1);
  if (req.method === "GET")
    return {
      utenti: righe(await db.execute("SELECT id, name, surname, username, tel, level, telegram_chat_id, last_login FROM users ORDER BY surname COLLATE NOCASE, name COLLATE NOCASE")).map(
        utenteAdmin,
      ),
    };
  if (req.method === "POST") return crea(b);
  if (req.method === "PUT" && q.action === "modifica") return modifica(b);
  if (req.method === "PUT" && q.action === "reset") return reset(b);
  if (req.method === "DELETE") return elimina(me, b);
  throw new Errore(404, "Richiesta non riconosciuta.");
});
