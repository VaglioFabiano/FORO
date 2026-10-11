/**
 * /api/turni — turni dei volontari e orari della settimana (ex orari_settimana.js). BACKEND.md §9, §11.
 *   GET    ?dal=&al=           turni nel periodo (livello ≤ 4)
 *   POST                       { id?, data, inizio, fine, userId, note, straordinario } salva un turno
 *   DELETE                     { id }
 *   GET    ?action=orari       { current, next } (pubblico, come oggi)
 *   PUT    ?action=orari       { settimana: "current"|"next", fasce: [{ id?, giorno, ora_inizio, ora_fine, note }] }
 *   POST   ?action=avviso      { testo } → messaggio al canale @aulastudioforo
 * Messaggi Telegram e testi uguali a client/api/turni.js.
 */
import { db, funzione, corpo, query, righe, riga, Errore, BUMP_VERSIONE, testo, intero, DATA_RE, ORA_RE } from "./_db.js";
import { richiedi } from "./_auth.js";
import { roma, toMin, giornoEData, GIORNI, normalizzaGiorno } from "./_tempo.js";
import { provaTelegram, inviaTelegram, ADMIN_CHAT_ID, CANALE_ORARI } from "./_telegram.js";

/* ───────── turni ───────── */
const turno = (r) => ({
  id: String(r.id),
  data: String(r.data),
  inizio: String(r.turno_inizio),
  fine: String(r.turno_fine),
  userId: r.user_id == null ? null : Number(r.user_id),
  note: r.note ? String(r.note) : undefined,
  // solo il valore 1 è "straordinario": la stringa di default '(FALSE)' in JavaScript varrebbe vero (§3)
  straordinario: Number(r.is_closed_override) === 1 || undefined,
});

async function persona(id) {
  if (id == null) return null;
  return riga(await db.execute({ sql: "SELECT id, name, surname, telegram_chat_id FROM users WHERE id = ?", args: [id] }));
}

/** come sendTurnoNotification di client/api/turni.js */
async function avvisa(azione, t, chi, destinatarioId) {
  const quando = `${giornoEData(t.data)} delle ${t.inizio}-${t.fine}`;
  const autore = `${chi.name} ${chi.surname}`;
  const testi = {
    self_assigned: [chi.id, `✅ Ti sei aggiunto al turno di ${quando}`],
    closed_assigned: [chi.id, `⚠️ Ti sei aggiunto al turno STRAORDINARIO di ${quando}`],
    assigned: [destinatarioId, `📋 ${autore} ti ha aggiunto al turno di ${quando}`],
    self_removed: [chi.id, `❌ Ti sei rimosso dal turno di ${quando}`],
    removed: [destinatarioId, `🗑️ ${autore} ti ha rimosso dal turno di ${quando}`],
  };
  const [id, msg] = testi[azione] ?? [];
  if (id == null) return;
  const dest = Number(id) === Number(chi.id) ? chi : await persona(id);
  await provaTelegram(dest?.telegram_chat_id, msg);
}

async function avvisaAdmin(t, richiedenteId, note) {
  const u = await persona(richiedenteId);
  const msg = `🚨 <b>Richiesta Turno Straordinario</b>

👤 <b>Richiesto da:</b> ${u?.name ?? ""} ${u?.surname ?? ""}
📅 <b>Data:</b> ${giornoEData(t.data)}
⏰ <b>Orario:</b> ${t.inizio}-${t.fine}
${note ? `📝 <b>Motivo:</b> ${note}` : ""}

⚠️ Turno fuori standard o chiuso.`;
  await provaTelegram(ADMIN_CHAT_ID, msg);
}

async function leggiTurni(q) {
  const dal = testo(q.dal);
  const al = testo(q.al);
  if (!DATA_RE.test(dal) || !DATA_RE.test(al)) throw new Errore(400, "Periodo non valido.");
  const rs = await db.execute({
    sql: "SELECT id, data, turno_inizio, turno_fine, user_id, note, is_closed_override FROM turni WHERE data >= ? AND data <= ? ORDER BY data, turno_inizio",
    args: [dal, al],
  });
  return { turni: righe(rs).map(turno) };
}

async function salva(u, b) {
  const id = b.id != null && b.id !== "" ? intero(b.id) : null;
  const data = testo(b.data);
  const inizio = testo(b.inizio);
  const fine = testo(b.fine);
  const userId = intero(b.userId);
  const note = testo(b.note);
  const straordinario = !!b.straordinario;
  if (!DATA_RE.test(data)) throw new Errore(400, "Scegli il giorno del turno.", "data");
  if (!ORA_RE.test(inizio)) throw new Errore(400, "Scrivi l'orario di inizio nel formato 09:00.", "inizio");
  if (!ORA_RE.test(fine)) throw new Errore(400, "Scrivi l'orario di fine nel formato 13:00.", "fine");
  if (toMin(inizio) >= toMin(fine)) throw new Errore(400, "La fine del turno deve venire dopo l'inizio.", "fine");
  const r = roma();
  if (data < r.iso || (data === r.iso && toMin(fine) <= r.minutes))
    throw new Errore(400, "Questo orario è già passato: puoi prendere solo turni da adesso in poi.", "inizio");
  const target = await persona(userId);
  if (!target) throw new Errore(400, "Scegli la persona che prende il turno.", "userId");

  const sovr = riga(
    await db.execute({
      sql: `SELECT t.turno_inizio, t.turno_fine, t.user_id, u.name, u.surname FROM turni t LEFT JOIN users u ON u.id = t.user_id
            WHERE t.data = ? AND t.turno_inizio < ? AND t.turno_fine > ? AND t.id <> ? LIMIT 1`,
      args: [data, fine, inizio, id ?? -1],
    }),
  );
  if (sovr) {
    const chi = Number(sovr.user_id) === userId ? "a un altro tuo turno" : sovr.name ? `al turno di ${sovr.name} ${sovr.surname}` : "a un altro turno";
    throw new Errore(
      409,
      `Questo orario si sovrappone ${chi} (${sovr.turno_inizio}–${sovr.turno_fine}). In aula c'è una persona di turno alla volta: scegli un orario libero.`,
      "inizio",
    );
  }

  let prima = null;
  let salvato;
  if (id !== null) {
    prima = riga(await db.execute({ sql: "SELECT id, data, turno_inizio, turno_fine, user_id FROM turni WHERE id = ?", args: [id] }));
    if (!prima) throw new Errore(404, "Questo turno non c'è più: forse l'ha già rimosso qualcun altro.");
    salvato = riga(
      await db.execute({
        sql: `UPDATE turni SET data = ?, turno_inizio = ?, turno_fine = ?, user_id = ?, note = ?, is_closed_override = ?, fascia_id = NULL
              WHERE id = ? RETURNING id, data, turno_inizio, turno_fine, user_id, note, is_closed_override`,
        args: [data, inizio, fine, userId, note, straordinario ? 1 : 0, id],
      }),
    );
  } else {
    salvato = riga(
      await db.execute({
        sql: `INSERT INTO turni (data, turno_inizio, turno_fine, user_id, note, is_closed_override, fascia_id)
              VALUES (?, ?, ?, ?, ?, ?, NULL) RETURNING id, data, turno_inizio, turno_fine, user_id, note, is_closed_override`,
        args: [data, inizio, fine, userId, note, straordinario ? 1 : 0],
      }),
    );
  }
  const t = turno(salvato);

  // messaggi come oggi
  if (straordinario) await avvisaAdmin(t, userId, note);
  const exUser = prima?.user_id == null ? null : Number(prima.user_id);
  if (Number(u.id) === userId) {
    if (!(prima && exUser === userId)) await avvisa(straordinario ? "closed_assigned" : "self_assigned", t, u, userId);
  } else {
    await avvisa("assigned", t, u, userId);
  }
  // il turno è passato a un'altra persona: chi lo aveva viene avvisato che non è più suo
  if (prima && exUser !== null && exUser !== userId) {
    const vecchio = { data: String(prima.data), inizio: String(prima.turno_inizio), fine: String(prima.turno_fine) };
    await avvisa(exUser === Number(u.id) ? "self_removed" : "removed", vecchio, u, exUser);
  }
  return { turno: t };
}

async function rimuovi(u, b) {
  const id = intero(b.id);
  const t = riga(await db.execute({ sql: "DELETE FROM turni WHERE id = ? RETURNING id, data, turno_inizio, turno_fine, user_id, note, is_closed_override", args: [id] }));
  if (!t) throw new Errore(404, "Questo turno non c'è più: forse l'ha già rimosso qualcun altro.");
  const x = turno(t);
  if (x.userId !== null) await avvisa(x.userId === Number(u.id) ? "self_removed" : "removed", x, u, x.userId);
  return { ok: true };
}

/* ───────── orari ───────── */
const ORDINE = `ORDER BY CASE giorno WHEN 'lunedì' THEN 1 WHEN 'martedì' THEN 2 WHEN 'mercoledì' THEN 3 WHEN 'giovedì' THEN 4
  WHEN 'venerdì' THEN 5 WHEN 'sabato' THEN 6 WHEN 'domenica' THEN 7 END, ora_inizio`;
const fascia = (r) => ({
  id: Number(r.id),
  giorno: normalizzaGiorno(r.giorno),
  ora_inizio: String(r.ora_inizio),
  ora_fine: String(r.ora_fine),
  note: r.note ? String(r.note) : undefined,
});

export async function leggiOrari() {
  const [c, n] = await db.batch(
    [`SELECT id, giorno, ora_inizio, ora_fine, note FROM fasce_orarie ${ORDINE}`, `SELECT id, giorno, ora_inizio, ora_fine, note FROM fasce_orarie_prossima ${ORDINE}`],
    "read",
  );
  return { current: righe(c).map(fascia), next: righe(n).map(fascia) };
}

async function salvaOrari(b) {
  const tabella = b.settimana === "next" ? "fasce_orarie_prossima" : b.settimana === "current" ? "fasce_orarie" : null;
  if (!tabella) throw new Errore(400, "Scegli la settimana.");
  if (!Array.isArray(b.fasce)) throw new Errore(400, "Orari mancanti.");
  const fasce = b.fasce.map((f) => {
    // i giorni si scrivono come in giorni_settimana: minuscoli e NFC (mai lower() in SQL, §3)
    const giorno = normalizzaGiorno(f.giorno);
    if (!GIORNI.includes(giorno)) throw new Errore(400, `Giorno non valido: ${f.giorno}`);
    if (!ORA_RE.test(f.ora_inizio) || !ORA_RE.test(f.ora_fine)) throw new Errore(400, "Scrivi gli orari nel formato 09:00.");
    if (toMin(f.ora_inizio) >= toMin(f.ora_fine)) throw new Errore(400, "La chiusura deve venire dopo l'apertura.");
    return { id: f.id != null ? intero(f.id) : null, giorno, ora_inizio: f.ora_inizio, ora_fine: f.ora_fine, note: testo(f.note) };
  });
  // gli id restano quelli di prima: si aggiorna, si aggiunge e si toglie solo ciò che è cambiato
  const tenuti = fasce.filter((f) => Number.isInteger(f.id)).map((f) => f.id);
  const stmts = [
    tenuti.length
      ? { sql: `DELETE FROM ${tabella} WHERE id NOT IN (${tenuti.map(() => "?").join(",")})`, args: tenuti }
      : { sql: `DELETE FROM ${tabella}`, args: [] },
    ...fasce.map((f) =>
      Number.isInteger(f.id)
        ? { sql: `UPDATE ${tabella} SET giorno = ?, ora_inizio = ?, ora_fine = ?, note = ? WHERE id = ?`, args: [f.giorno, f.ora_inizio, f.ora_fine, f.note, f.id] }
        : { sql: `INSERT INTO ${tabella} (giorno, ora_inizio, ora_fine, note) VALUES (?, ?, ?, ?)`, args: [f.giorno, f.ora_inizio, f.ora_fine, f.note] },
    ),
    { sql: BUMP_VERSIONE, args: [] },
  ];
  await db.batch(stmts, "write");
  return leggiOrari();
}

export default funzione(async (req) => {
  const q = query(req);
  const b = corpo(req);
  if (q.action === "orari" && req.method === "GET") return leggiOrari();
  const u = await richiedi(req, 4);
  if (q.action === "orari" && req.method === "PUT") return salvaOrari(b);
  if (q.action === "avviso" && req.method === "POST") {
    const t = testo(b.testo);
    if (!t) throw new Errore(400, "Il messaggio è vuoto.", "testo");
    await inviaTelegram(CANALE_ORARI, t).catch((e) => {
      throw new Errore(502, `Telegram non ha accettato il messaggio: ${e.message}`);
    });
    return { ok: true };
  }
  if (!q.action && req.method === "GET") return leggiTurni(q);
  if (!q.action && req.method === "POST") return salva(u, b);
  if (!q.action && req.method === "DELETE") return rimuovi(u, b);
  throw new Errore(404, "Richiesta non riconosciuta.");
});
