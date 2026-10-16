/**
 * /api/eventi — eventi pubblici e gestione (BACKEND.md §9, §10).
 * Pubblico:
 *   GET                         eventi visibili con i posti prenotati (mai nomi né email)
 *   GET  ?slug=                 un evento visibile
 *   GET  ?action=image&id=      locandina salvata come BLOB (crea/modifica la ricevono come data URL)
 *   POST ?action=prenota        { eventoId, nome, cognome, email, biglietti, note } → { codice, token, ... }
 *   POST ?action=annulla        { token }
 * Livello ≤ 2:
 *   GET  ?action=admin          tutti gli eventi
 *   GET  ?action=partecipanti&id=
 *   POST ?action=crea · PUT ?action=modifica · PUT ?action=visibile · PUT ?action=evidenza
 *   PUT  ?action=checkin        { id, arrivati }
 *   POST ?action=scrivi         { id, oggetto, messaggio } → email a tutti i prenotati
 *   DELETE ?action=elimina      { id } · DELETE ?action=prenotazione { id }
 */
import crypto from "node:crypto";
import { db, funzione, corpo, query, righe, riga, Errore, BUMP_VERSIONE, testo, intero, slug, DATA_RE, ORA_RE, EMAIL_RE } from "./_db.js";
import { richiedi } from "./_auth.js";
import { roma } from "./_tempo.js";
import { inviaEmail, richiediEmail, escapeHtml } from "./_email.js";

/* valori dell'aula usati quando un evento vecchio non ha luogo e indirizzo (vetrina/src/data/eventi.ts) */
export const LUOGO = "Aula studio FORO";
export const INDIRIZZO = "Via Alfieri 4, Piossasco (TO)";
const MAX_BIGLIETTI = 10;
const IMMAGINE_BLOB = "/api/eventi?action=image&id=";
const MAX_LOCANDINA = 1.5 * 1024 * 1024; // il browser la manda già compressa (≈100 KB)
const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

const COLONNE = `e.id, e.titolo, e.descrizione, e.data_evento, e.orario, e.immagine_url, e.visibile, e.num_max, e.link_esterno,
  e.slug, e.sottotitolo, e.categoria, e.rassegna, e.registro, e.ora, e.ora_fine, e.luogo, e.indirizzo, e.aula, e.etichetta,
  e.indizi_json, e.info_json, e.prenotazione, e.solo_tesserati, e.patrocinio, e.composizione, e.foto_url, e.in_evidenza,
  COALESCE(length(e.immagine_blob), 0) AS blob_byte,
  (SELECT COALESCE(SUM(p.num_partecipanti), 0) FROM prenotazioni_eventi p WHERE p.evento_id = e.id) AS prenotati`;

/** "20:30", "20.30", "ore 21" → "HH:MM"; altrimenti "" */
export function oraDa(orario) {
  const m = String(orario ?? "").match(/(\d{1,2})(?:[:.](\d{2}))?/);
  if (!m) return "";
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 24 || min > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
const json = (s, fallback) => {
  try {
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
};

/** riga del database → Evento della vetrina (src/data/types.ts) */
export function evento(r) {
  const id = Number(r.id);
  return {
    id,
    slug: r.slug || `${slug(r.titolo) || "evento"}-${id}`,
    titolo: r.titolo ?? "",
    sottotitolo: r.sottotitolo || undefined,
    categoria: r.categoria || "eventi",
    rassegna: r.rassegna || undefined,
    registro: r.registro === "silenzio" ? "silenzio" : "voce",
    data: String(r.data_evento ?? "").slice(0, 10),
    ora: r.ora || oraDa(r.orario),
    oraFine: r.ora_fine || undefined,
    luogo: r.luogo || LUOGO,
    indirizzo: r.indirizzo || INDIRIZZO,
    aula: r.aula === "foro" || r.aula === "agora" ? r.aula : undefined,
    etichetta: r.etichetta || undefined,
    // &v= cambia quando cambia la locandina: la cache di un giorno non mostra quella vecchia
    immagine: r.immagine_url || (Number(r.blob_byte) ? `${IMMAGINE_BLOB}${id}&v=${Number(r.blob_byte)}` : undefined),
    descrizione: r.descrizione ?? "",
    indizi: json(r.indizi_json, undefined),
    info: json(r.info_json, undefined),
    prenotazione: Number(r.prenotazione ?? 1) === 1,
    postiMax: Number(r.num_max) || 0,
    prenotati: Number(r.prenotati) || 0,
    soloTesserati: Number(r.solo_tesserati) === 1,
    patrocinio: r.patrocinio || undefined,
    visibile: Number(r.visibile) === 1,
    composizione: ["post", "locandina", "pieno", "ufficiale"].includes(r.composizione) ? r.composizione : "locandina",
    foto: r.foto_url || undefined,
    evidenza: r.in_evidenza === 1 || r.in_evidenza === 2 ? r.in_evidenza : Number(r.in_evidenza) || undefined,
    linkEsterno: r.link_esterno || undefined,
  };
}

export async function eventiVisibili() {
  return righe(await db.execute(`SELECT ${COLONNE} FROM eventi e WHERE e.visibile = 1 ORDER BY e.data_evento DESC`)).map(evento);
}

/* ───────── pubblico ───────── */
async function immagine(res, id) {
  const r = riga(await db.execute({ sql: "SELECT immagine_blob, immagine_tipo FROM eventi WHERE id = ?", args: [id] }));
  if (!r?.immagine_blob) throw new Errore(404, "Immagine non trovata.");
  const b = r.immagine_blob;
  const buf = Buffer.isBuffer(b) ? b : b instanceof ArrayBuffer ? Buffer.from(b) : typeof b === "string" ? Buffer.from(b, "base64") : Buffer.from(new Uint8Array(b));
  res.statusCode = 200;
  res.setHeader("Content-Type", r.immagine_tipo || "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.end(buf);
}

function emailConferma(nome, biglietti, ev, codice) {
  const orarioTesto = ev.ora ? ` alle ore ${escapeHtml(ev.ora)}` : "";
  const bigliettiTesto = biglietti === 1 ? "1 biglietto" : `${biglietti} biglietti`;
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #034a5a;">Prenotazione Confermata</h2>
        <p>Ciao <strong>${escapeHtml(nome)}</strong>,</p>
        <p>Ti confermiamo la tua iscrizione all'evento:</p>
        <h3 style="color: #333;">${escapeHtml(ev.titolo)}</h3>
        <p><strong>Numero biglietti:</strong> ${bigliettiTesto}</p>
        ${codice ? `<p><strong>Codice prenotazione:</strong> ${escapeHtml(codice)}</p>` : ""}
        <p><strong>Data:</strong> ${new Date(`${ev.data}T12:00:00Z`).toLocaleDateString("it-IT", { timeZone: "UTC" })}${orarioTesto}</p>
        <p><strong>Luogo:</strong> ${escapeHtml(`${ev.luogo}, ${ev.indirizzo}`)}</p>

        <div style="margin-top: 25px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #034a5a; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.5;">
            <strong>Gestione prenotazione:</strong> se per qualsiasi motivo non potrai più partecipare,
            ti chiediamo la cortesia di avvisarci per liberare i posti.
            Puoi annullare la prenotazione rispondendo a questa mail o scrivendo a:
            <a href="mailto:associazioneforopiossasco@gmail.com" style="color: #034a5a; font-weight: bold; text-decoration: none;">associazioneforopiossasco@gmail.com</a>
          </p>
        </div>

        <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">Associazione Foro</p>
      </div>
    </div>
  `;
}

async function prenota(b) {
  const eventoId = intero(b.eventoId);
  const nome = testo(b.nome);
  const cognome = testo(b.cognome);
  const email = testo(b.email).toLowerCase();
  const biglietti = intero(b.biglietti ?? 1);
  const note = testo(b.note);
  if (!nome) throw new Errore(400, "Scrivi il tuo nome.", "nome");
  if (!cognome) throw new Errore(400, "Scrivi il tuo cognome.", "cognome");
  if (!EMAIL_RE.test(email)) throw new Errore(400, "Controlla l'indirizzo email: sembra incompleto.", "email");
  if (!(biglietti >= 1 && biglietti <= MAX_BIGLIETTI)) throw new Errore(400, `Puoi prenotare da 1 a ${MAX_BIGLIETTI} biglietti.`, "biglietti");
  if (!b.privacy) throw new Errore(400, "Per prenotare serve accettare l'informativa sulla privacy.", "privacy");
  richiediEmail();
  const oggi = roma().iso;
  const token = crypto.randomBytes(24).toString("hex");
  // una sola istruzione: due prenotazioni contemporanee sull'ultimo posto non passano entrambe (§9)
  const rs = await db.batch(
    [
      {
        sql: `INSERT INTO prenotazioni_eventi (evento_id, nome, cognome, email, num_partecipanti, note, data_prenotazione, token)
              SELECT ?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), ?7
              WHERE EXISTS (SELECT 1 FROM eventi e WHERE e.id = ?1 AND e.visibile = 1 AND e.prenotazione = 1 AND substr(e.data_evento, 1, 10) >= ?8
                AND (COALESCE(e.num_max, 0) = 0 OR (SELECT COALESCE(SUM(num_partecipanti), 0) FROM prenotazioni_eventi WHERE evento_id = ?1) + ?5 <= e.num_max))`,
        args: [eventoId, nome, cognome, email, biglietti, note, token, oggi],
      },
      {
        sql: "UPDATE prenotazioni_eventi SET codice = printf('FORO-%d-%05d', evento_id, id) WHERE id = last_insert_rowid() AND changes() = 1 AND token = ?",
        args: [token],
      },
      { sql: BUMP_VERSIONE, args: [] },
    ],
    "write",
  );
  const ev = riga(await db.execute({ sql: `SELECT ${COLONNE} FROM eventi e WHERE e.id = ?`, args: [eventoId] }));
  if (rs[0].rowsAffected !== 1) {
    if (!ev || Number(ev.visibile) !== 1) throw new Errore(404, "Non troviamo questo evento. Torna al calendario e riprova.");
    const e = evento(ev);
    if (e.data < oggi) throw new Errore(400, "Questo evento è già passato: le prenotazioni sono chiuse.");
    if (!e.prenotazione) throw new Errore(400, "Per questo evento non serve prenotarsi: vieni direttamente all'orario indicato.");
    const rimasti = Math.max(0, e.postiMax - e.prenotati);
    throw new Errore(
      409,
      rimasti === 0
        ? "L'evento ha raggiunto il numero massimo di partecipanti."
        : `Sono rimasti solo ${rimasti} ${rimasti === 1 ? "posto" : "posti"}. Riduci il numero di biglietti.`,
      "biglietti",
    );
  }
  const p = riga(await db.execute({ sql: "SELECT id, codice, data_prenotazione FROM prenotazioni_eventi WHERE token = ?", args: [token] }));
  const e = evento(ev);
  let emailInviata = true;
  try {
    await inviaEmail(email, `Conferma Prenotazione: ${e.titolo}`, emailConferma(nome, biglietti, e, p.codice), `Confermata prenotazione per ${e.titolo}${p.codice ? ` · codice ${p.codice}` : ""}`);
  } catch (err) {
    console.error(`[eventi] email di conferma non inviata (prenotazione ${p.id}):`, err.message);
    emailInviata = false;
  }
  return {
    prenotazione: {
      id: String(p.id),
      eventoId,
      nome,
      cognome,
      email,
      biglietti,
      note: note || undefined,
      creataIl: `${String(p.data_prenotazione).replace(" ", "T")}Z`,
      codice: p.codice,
      token,
    },
    prenotati: e.prenotati,
    emailInviata,
  };
}

async function annulla(b) {
  const token = testo(b.token);
  if (!/^[0-9a-f]{48}$/.test(token)) throw new Errore(400, "Il link per annullare non è valido.");
  const rs = await db.batch(
    [
      { sql: "DELETE FROM prenotazioni_eventi WHERE token = ?", args: [token] },
      { sql: BUMP_VERSIONE, args: [] },
    ],
    "write",
  );
  if (rs[0].rowsAffected === 0) throw new Errore(404, "Questa prenotazione non c'è più: forse è già stata annullata.");
  return { ok: true };
}

/* ───────── gestione (livello ≤ 2) ───────── */
/**
 * Colonne della locandina da scrivere.
 * - data URL (immagine nuova dal browser) → BLOB in Turso;
 * - il nostro indirizzo del BLOB (locandina invariata) → il BLOB resta com'è;
 * - un link esterno o niente → si usa il link e il BLOB si svuota.
 */
function locandina(v) {
  const s = testo(v);
  const m = s.match(DATA_URL_RE);
  if (m) {
    const buf = Buffer.from(m[2], "base64");
    if (!buf.length) throw new Errore(400, "L'immagine della locandina è vuota. Scegline un'altra.", "immagine");
    if (buf.length > MAX_LOCANDINA) throw new Errore(400, "La locandina è troppo pesante anche dopo la compressione. Scegline una più leggera.", "immagine");
    return { immagine_url: "", immagine_blob: buf, immagine_tipo: m[1], immagine_nome: null };
  }
  if (s.startsWith(IMMAGINE_BLOB)) return { immagine_url: "" };
  if (s.startsWith("data:")) throw new Errore(400, "Il formato della locandina non va bene. Scegli un JPG, un PNG, un GIF o un WebP.", "immagine");
  return { immagine_url: s, immagine_blob: null, immagine_tipo: null, immagine_nome: null };
}

function campiEvento(b) {
  const titolo = testo(b.titolo);
  const data = testo(b.data);
  const ora = testo(b.ora);
  const oraFine = testo(b.oraFine);
  if (!titolo) throw new Errore(400, "Scrivi il titolo dell'evento.", "titolo");
  if (!DATA_RE.test(data)) throw new Errore(400, "Scegli la data dell'evento.", "data");
  if (!ORA_RE.test(ora)) throw new Errore(400, "Scrivi l'orario nel formato 20:30.", "ora");
  if (oraFine && !ORA_RE.test(oraFine)) throw new Errore(400, "Scrivi l'orario di fine nel formato 23:00.", "oraFine");
  const postiMax = Math.max(0, intero(b.postiMax ?? 0) || 0);
  const indizi = b.indizi && typeof b.indizi === "object" && Object.values(b.indizi).some((v) => testo(v)) ? JSON.stringify(b.indizi) : null;
  const info = Array.isArray(b.info) && b.info.length ? JSON.stringify(b.info.filter((x) => testo(x?.label) || testo(x?.value))) : null;
  return {
    titolo,
    descrizione: typeof b.descrizione === "string" ? b.descrizione : "",
    data_evento: data,
    orario: ora, // la colonna vecchia resta allineata: il vecchio sito la legge ancora durante la fase 1
    ora,
    ora_fine: oraFine || null,
    ...locandina(b.immagine),
    num_max: postiMax,
    link_esterno: testo(b.linkEsterno),
    sottotitolo: testo(b.sottotitolo) || null,
    categoria: testo(b.categoria) || "eventi",
    rassegna: testo(b.rassegna) || null,
    registro: b.registro === "silenzio" ? "silenzio" : "voce",
    luogo: testo(b.luogo) || LUOGO,
    indirizzo: testo(b.indirizzo) || INDIRIZZO,
    aula: b.aula === "foro" || b.aula === "agora" ? b.aula : null,
    etichetta: testo(b.etichetta) || null,
    indizi_json: indizi,
    info_json: info,
    prenotazione: b.prenotazione === false ? 0 : 1,
    solo_tesserati: b.soloTesserati ? 1 : 0,
    patrocinio: testo(b.patrocinio) || null,
    composizione: ["post", "locandina", "pieno", "ufficiale"].includes(b.composizione) ? b.composizione : "locandina",
    foto_url: testo(b.foto) || null,
  };
}

async function unoAdmin(id) {
  const r = riga(await db.execute({ sql: `SELECT ${COLONNE} FROM eventi e WHERE e.id = ?`, args: [id] }));
  if (!r) throw new Errore(404, "Questo evento non c'è più.");
  return evento(r);
}

async function crea(b) {
  const c = campiEvento(b);
  const visibile = b.visibile ? 1 : 0;
  const cols = Object.keys(c);
  const rs = await db.batch(
    [
      { sql: `INSERT INTO eventi (${cols.join(", ")}, visibile) VALUES (${cols.map(() => "?").join(", ")}, ?)`, args: [...Object.values(c), visibile] },
      { sql: "UPDATE eventi SET slug = ? || '-' || id WHERE id = last_insert_rowid() AND changes() = 1", args: [slug(c.titolo) || "evento"] },
      { sql: BUMP_VERSIONE, args: [] },
    ],
    "write",
  );
  return { evento: await unoAdmin(Number(rs[0].lastInsertRowid)) };
}

async function modifica(b) {
  const id = intero(b.id);
  const c = campiEvento(b);
  const sets = Object.keys(c).map((k) => `${k} = ?`);
  const args = Object.values(c);
  if (typeof b.visibile === "boolean") {
    sets.push("visibile = ?");
    args.push(b.visibile ? 1 : 0);
  }
  const rs = await db.batch(
    [
      { sql: `UPDATE eventi SET ${sets.join(", ")} WHERE id = ?`, args: [...args, id] },
      { sql: "UPDATE eventi SET slug = ? || '-' || id WHERE id = ? AND (slug IS NULL OR slug = '')", args: [slug(c.titolo) || "evento", id] },
      { sql: BUMP_VERSIONE, args: [] },
    ],
    "write",
  );
  if (rs[0].rowsAffected === 0) throw new Errore(404, "Questo evento non c'è più.");
  return { evento: await unoAdmin(id) };
}

async function partecipanti(id) {
  const rs = await db.execute({
    sql: `SELECT id, evento_id, nome, cognome, email, num_partecipanti, note, data_prenotazione, num_arrivati, codice
          FROM prenotazioni_eventi WHERE evento_id = ? ORDER BY data_prenotazione DESC`,
    args: [id],
  });
  return {
    partecipanti: righe(rs).map((p) => ({
      id: String(p.id),
      eventoId: Number(p.evento_id),
      nome: p.nome ?? "",
      cognome: p.cognome ?? "",
      email: p.email ?? "",
      biglietti: Number(p.num_partecipanti) || 0,
      note: p.note || undefined,
      creataIl: p.data_prenotazione ? `${String(p.data_prenotazione).replace(" ", "T").slice(0, 19)}Z` : "",
      codice: p.codice || `FORO-${p.evento_id}-${String(p.id).padStart(5, "0")}`,
      arrivati: Number(p.num_arrivati) || 0,
    })),
  };
}

function emailAvviso(messaggio, titolo) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #034a5a;">Avviso: ${escapeHtml(titolo)}</h2>
        <p style="white-space: pre-line;">${escapeHtml(messaggio)}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">Associazione Foro</p>
      </div>
    </div>
  `;
}

async function scrivi(b) {
  const id = intero(b.id);
  const oggetto = testo(b.oggetto);
  const messaggio = testo(b.messaggio);
  if (!oggetto) throw new Errore(400, "Scrivi l'oggetto della email.", "oggetto");
  if (!messaggio) throw new Errore(400, "Scrivi il messaggio.", "messaggio");
  richiediEmail();
  const ev = await unoAdmin(id);
  const dest = righe(await db.execute({ sql: "SELECT DISTINCT email FROM prenotazioni_eventi WHERE evento_id = ? AND email <> ''", args: [id] }));
  if (!dest.length) throw new Errore(400, "Nessun iscritto trovato.");
  const html = emailAvviso(messaggio, ev.titolo);
  let inviate = 0;
  for (const d of dest) {
    try {
      await inviaEmail(d.email, oggetto, html, messaggio);
      inviate++;
    } catch (e) {
      console.error("[eventi] email non inviata:", e.message);
    }
  }
  return { inviate, totali: dest.length };
}

export default funzione(async (req, res) => {
  const q = query(req);
  const b = corpo(req);
  const { action } = q;

  if (req.method === "GET" && action === "image") return immagine(res, intero(q.id));
  if (req.method === "GET" && !action) {
    const lista = await eventiVisibili();
    if (q.slug) {
      const e = lista.find((x) => x.slug === q.slug || String(x.id) === q.slug);
      if (!e) throw new Errore(404, "Evento non trovato.");
      return { evento: e };
    }
    return { eventi: lista };
  }
  if (req.method === "POST" && action === "prenota") return prenota(b);
  if (req.method === "POST" && action === "annulla") return annulla(b);

  await richiedi(req, 2);
  if (req.method === "GET" && action === "admin")
    return { eventi: righe(await db.execute(`SELECT ${COLONNE} FROM eventi e ORDER BY e.data_evento DESC`)).map(evento) };
  if (req.method === "GET" && action === "partecipanti") return partecipanti(intero(q.id));
  if (req.method === "POST" && action === "crea") return crea(b);
  if (req.method === "PUT" && action === "modifica") return modifica(b);
  if (req.method === "PUT" && action === "visibile") {
    const id = intero(b.id);
    await db.batch([{ sql: "UPDATE eventi SET visibile = ? WHERE id = ?", args: [b.visibile ? 1 : 0, id] }, { sql: BUMP_VERSIONE, args: [] }], "write");
    return { evento: await unoAdmin(id) };
  }
  if (req.method === "PUT" && action === "evidenza") {
    const id = intero(b.id);
    const n = b.n === 1 || b.n === 2 ? b.n : null;
    // prima si toglie a chi ce l'ha, poi si assegna: l'ordine opposto viola l'indice unico (§9)
    const stmts = n
      ? [
          { sql: "UPDATE eventi SET in_evidenza = NULL WHERE in_evidenza = ? AND id <> ?", args: [n, id] },
          { sql: "UPDATE eventi SET in_evidenza = ? WHERE id = ?", args: [n, id] },
        ]
      : [{ sql: "UPDATE eventi SET in_evidenza = NULL WHERE id = ?", args: [id] }];
    await db.batch([...stmts, { sql: BUMP_VERSIONE, args: [] }], "write");
    return { ok: true };
  }
  if (req.method === "PUT" && action === "checkin") {
    const arrivati = Math.max(0, intero(b.arrivati) || 0);
    await db.execute({ sql: "UPDATE prenotazioni_eventi SET num_arrivati = ? WHERE id = ?", args: [arrivati, intero(b.id)] });
    return { ok: true };
  }
  if (req.method === "POST" && action === "scrivi") return scrivi(b);
  if (req.method === "DELETE" && action === "elimina") {
    const id = intero(b.id);
    await db.batch(
      [
        { sql: "DELETE FROM prenotazioni_eventi WHERE evento_id = ?", args: [id] },
        { sql: "DELETE FROM eventi WHERE id = ?", args: [id] },
        { sql: BUMP_VERSIONE, args: [] },
      ],
      "write",
    );
    return { ok: true };
  }
  if (req.method === "DELETE" && action === "prenotazione") {
    await db.batch([{ sql: "DELETE FROM prenotazioni_eventi WHERE id = ?", args: [intero(b.id)] }, { sql: BUMP_VERSIONE, args: [] }], "write");
    return { ok: true };
  }
  throw new Errore(404, "Richiesta non riconosciuta.");
});
