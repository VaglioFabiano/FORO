/**
 * /api/presenze — conteggi delle presenze per fascia (BACKEND.md §9).
 *   GET    ?dal=&al=   presenze + storico (fino alla fase 3), con le fasce normalizzate come oggi
 *   POST   { data, fascia, numero, note }   inserisce o corregge
 *   DELETE { data, fascia }
 * Tutto livello ≤ 4. Il report PDF (livello ≤ 1) si genera nel browser con questi dati.
 */
import { db, funzione, corpo, query, righe, Errore, testo, intero, DATA_RE } from "./_db.js";
import { richiedi } from "./_auth.js";
import { roma } from "./_tempo.js";

const FASCE = ["9-13", "13-16", "16-19", "21-24"];

/** come normalizzaFascia di client/api/presenze.js */
function normalizzaFascia(input) {
  let s = String(input ?? "").trim();
  if (s.endsWith(".0")) s = s.replace(".0", "");
  if (FASCE.includes(s)) return s;
  const m = s.match(/^0?(\d{1,2})/);
  if (m) {
    const h = Number(m[1]);
    if (h >= 5 && h < 13) return "9-13";
    if (h >= 13 && h < 16) return "13-16";
    if (h >= 16 && h < 20) return "16-19";
    if (h >= 20 || h < 5) return "21-24";
  }
  return s;
}
const isoUtc = (ts) => (ts ? `${String(ts).replace(" ", "T").slice(0, 19)}Z` : undefined);

async function leggi(q) {
  const dal = testo(q.dal);
  const al = testo(q.al);
  if (!DATA_RE.test(dal) || !DATA_RE.test(al)) throw new Errore(400, "Periodo non valido.");
  const [attive, storico] = await db.batch(
    [
      {
        // fasce vecchie salvate come id di fasce_orarie: si risolvono come fa oggi fetchUnifiedData
        sql: `SELECT p.data, CASE WHEN p.fascia_oraria LIKE '%-%' THEN CAST(p.fascia_oraria AS TEXT)
                ELSE COALESCE(f.ora_inizio || '-' || f.ora_fine, CAST(p.fascia_oraria AS TEXT)) END AS fascia_raw,
                p.numero_presenze, p.note, p.user_id, COALESCE(p.updated_at, p.created_at) AS il
              FROM presenze p
              LEFT JOIN fasce_orarie f ON p.fascia_oraria NOT LIKE '%-%' AND CAST(p.fascia_oraria AS INTEGER) = f.id
              WHERE p.data >= ? AND p.data <= ?`,
        args: [dal, al],
      },
      { sql: "SELECT data, orario AS fascia_raw, numero_presenze, note, created_at AS il FROM presenze_storico WHERE data >= ? AND data <= ?", args: [dal, al] },
    ],
    "read",
  );
  const out = new Map();
  // prima lo storico, poi le presenze attive: a parità di giorno e fascia vince il dato attivo (l'ultima correzione)
  for (const [rs, attivo] of [
    [storico, false],
    [attive, true],
  ]) {
    for (const r of righe(rs)) {
      const fascia = normalizzaFascia(r.fascia_raw);
      if (!FASCE.includes(fascia)) continue;
      const data = String(r.data).slice(0, 10);
      out.set(`${data}|${fascia}`, {
        data,
        fascia,
        numero: Number(r.numero_presenze) || 0,
        note: r.note ? String(r.note) : undefined,
        userId: attivo && r.user_id != null ? Number(r.user_id) : undefined,
        il: isoUtc(r.il),
      });
    }
  }
  return { presenze: [...out.values()] };
}

export default funzione(async (req) => {
  const u = await richiedi(req, 4);
  const b = corpo(req);
  if (req.method === "GET") return leggi(query(req));
  const data = testo(b.data);
  const fascia = testo(b.fascia);
  if (!DATA_RE.test(data)) throw new Errore(400, "Scegli il giorno.", "data");
  if (!FASCE.includes(fascia)) throw new Errore(400, "Scegli la fascia oraria.", "fascia");
  if (req.method === "POST") {
    const numero = intero(b.numero);
    if (!(numero >= 0 && numero <= 999)) throw new Errore(400, "Scrivi il numero di presenze.", "numero");
    if (data > roma().iso) throw new Errore(400, "Non si possono registrare presenze di un giorno futuro.", "data");
    await db.execute({
      sql: `INSERT INTO presenze (data, fascia_oraria, numero_presenze, note, user_id) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(data, fascia_oraria) DO UPDATE SET numero_presenze = excluded.numero_presenze, note = excluded.note,
              user_id = excluded.user_id, updated_at = CURRENT_TIMESTAMP`,
      args: [data, fascia, numero, testo(b.note), u.id],
    });
    return { ok: true };
  }
  if (req.method === "DELETE") {
    await db.execute({ sql: "DELETE FROM presenze WHERE data = ? AND fascia_oraria = ?", args: [data, fascia] });
    return { ok: true };
  }
  throw new Errore(404, "Richiesta non riconosciuta.");
});
