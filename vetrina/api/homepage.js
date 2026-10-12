/**
 * /api/homepage — tutto quello che serve alla homepage in una richiesta, più il salvataggio dei testi (BACKEND.md §14).
 *   GET                          { versione, contenuti, categorie, eventi, orari, storia } — in cache CDN 60 s, ETag = versione
 *   PUT    ?action=contenuti     { valori: { chiave: testo | null } }  (null = torna al testo originale)   livello ≤ 2
 *   PUT    ?action=storia        { tappe: [...] }                                                        livello ≤ 2
 *   PUT    ?action=categorie     { categorie: [{ id, label }] }                                          livello ≤ 2
 *   POST   ?action=segnalazione  { categoria, aula, messaggio, anonima, nome, email } → { codice }        pubblico
 *   GET    ?action=segnalazioni                                                                          livello ≤ 2
 */
import { db, funzione, corpo, query, righe, riga, Errore, BUMP_VERSIONE, testo, EMAIL_RE } from "./_db.js";
import { richiedi } from "./_auth.js";
import { eventiVisibili } from "./eventi.js";
import { leggiOrari } from "./turni.js";

async function versione() {
  const r = riga(await db.execute("SELECT valore FROM meta WHERE chiave = 'versione_sito'"));
  return Number(r?.valore ?? 0);
}

async function bundle() {
  const [m, c, k, s] = await db.batch(
    [
      "SELECT valore FROM meta WHERE chiave = 'versione_sito'",
      "SELECT chiave, valore FROM contenuti",
      "SELECT id, label FROM categorie_eventi ORDER BY ordine, label",
      "SELECT id, anno, titolo, testo, approfondimento FROM storia_tappe ORDER BY ordine",
    ],
    "read",
  );
  const [eventi, orari] = await Promise.all([eventiVisibili(), leggiOrari()]);
  return {
    versione: Number(riga(m)?.valore ?? 0),
    contenuti: Object.fromEntries(righe(c).map((r) => [r.chiave, r.valore])),
    categorie: righe(k).map((r) => ({ id: r.id, label: r.label })),
    eventi,
    orari,
    storia: righe(s).map((r) => ({ id: r.id, anno: r.anno, titolo: r.titolo, testo: r.testo, approfondimento: r.approfondimento || undefined })),
  };
}

async function salvaContenuti(u, b) {
  const valori = b.valori && typeof b.valori === "object" ? Object.entries(b.valori) : [];
  if (!valori.length) throw new Errore(400, "Nessun testo da salvare.");
  const stmts = valori.map(([chiave, valore]) => {
    if (!/^[a-z0-9_.-]{1,100}$/i.test(chiave)) throw new Errore(400, `Chiave non valida: ${chiave}`);
    if (valore === null) return { sql: "DELETE FROM contenuti WHERE chiave = ?", args: [chiave] };
    if (typeof valore !== "string" || valore.length > 8000) throw new Errore(400, "Il testo è troppo lungo.");
    return {
      sql: `INSERT INTO contenuti (chiave, valore, aggiornato_il, aggiornato_da) VALUES (?, ?, datetime('now'), ?)
            ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore, aggiornato_il = excluded.aggiornato_il, aggiornato_da = excluded.aggiornato_da`,
      args: [chiave, valore, u.id],
    };
  });
  await db.batch([...stmts, { sql: BUMP_VERSIONE, args: [] }], "write");
  return { versione: await versione() };
}

async function salvaStoria(b) {
  if (!Array.isArray(b.tappe)) throw new Errore(400, "Tappe mancanti.");
  const tappe = b.tappe.map((t, i) => {
    const x = { id: testo(t.id) || `t-${Date.now().toString(36)}-${i}`, anno: testo(t.anno), titolo: testo(t.titolo), testo: testo(t.testo), approfondimento: testo(t.approfondimento) || null };
    if (!x.titolo) throw new Errore(400, `Scrivi il titolo della tappa ${i + 1}.`);
    return x;
  });
  if (new Set(tappe.map((t) => t.id)).size !== tappe.length) throw new Errore(400, "Due tappe hanno lo stesso id.");
  await db.batch(
    [
      { sql: "DELETE FROM storia_tappe", args: [] },
      ...tappe.map((t, i) => ({
        sql: "INSERT INTO storia_tappe (id, anno, titolo, testo, approfondimento, ordine) VALUES (?, ?, ?, ?, ?, ?)",
        args: [t.id, t.anno, t.titolo, t.testo, t.approfondimento, i + 1],
      })),
      { sql: BUMP_VERSIONE, args: [] },
    ],
    "write",
  );
  return { versione: await versione() };
}

async function salvaCategorie(b) {
  if (!Array.isArray(b.categorie) || !b.categorie.length) throw new Errore(400, "Serve almeno una categoria.");
  const cat = b.categorie.map((c) => ({ id: testo(c.id), label: testo(c.label) }));
  if (cat.some((c) => !/^[a-z0-9-]{1,40}$/.test(c.id) || !c.label)) throw new Errore(400, "Ogni categoria ha bisogno di un nome.");
  if (new Set(cat.map((c) => c.id)).size !== cat.length) throw new Errore(400, "Due categorie hanno lo stesso nome.");
  // la usano la Panoramica e il form eventi (§6, M1)
  if (!cat.some((c) => c.id === "assemblee")) throw new Errore(400, "La categoria Assemblee non si può eliminare.");
  await db.batch(
    [
      { sql: "DELETE FROM categorie_eventi", args: [] },
      ...cat.map((c, i) => ({ sql: "INSERT INTO categorie_eventi (id, label, ordine) VALUES (?, ?, ?)", args: [c.id, c.label, i + 1] })),
      { sql: BUMP_VERSIONE, args: [] },
    ],
    "write",
  );
  return { versione: await versione() };
}

const CATEGORIE_SEGN = ["guasto", "pulizia", "regolamento", "proposta", "generico", "altro"];
const LUOGHI_SEGN = ["foro", "agora", "ristoro", "esterno", "generico", "altro"];

async function segnalazione(b) {
  const messaggio = testo(b.messaggio);
  const anonima = !!b.anonima;
  const nome = anonima ? null : testo(b.nome) || null;
  const email = anonima ? null : testo(b.email).toLowerCase() || null;
  if (!CATEGORIE_SEGN.includes(b.categoria)) throw new Errore(400, "Scegli di cosa si tratta.", "categoria");
  if (!LUOGHI_SEGN.includes(b.aula)) throw new Errore(400, "Scegli dove.", "aula");
  if (messaggio.length < 10) throw new Errore(400, "Raccontaci qualcosa in più: bastano un paio di righe.", "messaggio");
  if (messaggio.length > 800) throw new Errore(400, "Il messaggio è troppo lungo: al massimo 800 caratteri.", "messaggio");
  if (email && !EMAIL_RE.test(email)) throw new Errore(400, "Controlla l'indirizzo email.", "email");
  const rs = await db.batch(
    [
      { sql: "INSERT INTO segnalazioni_sito (categoria, aula, messaggio, anonima, nome, email) VALUES (?, ?, ?, ?, ?, ?)", args: [b.categoria, b.aula, messaggio, anonima ? 1 : 0, nome, email] },
      // il codice nasce nello stesso batch, dall'id appena inserito (§6, M6)
      { sql: "UPDATE segnalazioni_sito SET codice = printf('S-%s-%04d', strftime('%Y', creata_il), id) WHERE id = last_insert_rowid() AND changes() = 1 RETURNING codice, creata_il", args: [] },
    ],
    "write",
  );
  const r = riga(rs[1]);
  return { codice: r?.codice, creataIl: r ? `${String(r.creata_il).replace(" ", "T")}Z` : new Date().toISOString() };
}

async function segnalazioni() {
  const rs = await db.execute("SELECT * FROM segnalazioni_sito ORDER BY id DESC");
  return {
    segnalazioni: righe(rs).map((r) => ({
      id: String(r.id),
      codice: r.codice ?? `S-${String(r.creata_il).slice(0, 4)}-${String(r.id).padStart(4, "0")}`,
      categoria: r.categoria,
      aula: r.aula,
      messaggio: r.messaggio,
      anonima: Number(r.anonima) === 1,
      nome: r.nome || undefined,
      email: r.email || undefined,
      creataIl: `${String(r.creata_il).replace(" ", "T")}Z`,
    })),
  };
}

/** sitemap per i motori di ricerca: homepage, privacy e la pagina di ogni evento visibile (/sitemap.xml, vedi vercel.json) */
async function sitemap(res) {
  const eventi = await eventiVisibili();
  const url = (loc, extra = "") => `  <url>\n    <loc>https://foroets.com${loc}</loc>${extra}\n  </url>`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url("/", "\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>"),
    url("/privacy", "\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>"),
    ...eventi.map((e) => url(`/eventi/${encodeURIComponent(e.slug)}`, "\n    <priority>0.7</priority>")),
    "</urlset>",
  ].join("\n");
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.end(xml);
}

export default funzione(async (req, res) => {
  const { action } = query(req);
  const b = corpo(req);
  if (req.method === "GET" && !action) {
    const data = await bundle();
    const etag = `"v${data.versione}"`;
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
    res.setHeader("ETag", etag);
    if (req.headers?.["if-none-match"] === etag) {
      res.statusCode = 304;
      return res.end();
    }
    return data;
  }
  if (req.method === "GET" && action === "sitemap") return sitemap(res);
  if (req.method === "POST" && action === "segnalazione") return segnalazione(b);
  const u = await richiedi(req, 2);
  if (req.method === "GET" && action === "segnalazioni") return segnalazioni();
  if (req.method === "PUT" && action === "contenuti") return salvaContenuti(u, b);
  if (req.method === "PUT" && action === "storia") return salvaStoria(b);
  if (req.method === "PUT" && action === "categorie") return salvaCategorie(b);
  throw new Errore(404, "Richiesta non riconosciuta.");
});
