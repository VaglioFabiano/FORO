/**
 * /api/documenti — proxy dell'Apps Script che crea i verbali su Google Drive (BACKEND.md §9, §12).
 *   GET  ?action=regolamento&id=                 → testo del Google Doc (cache CDN 5 min)   pubblico
 *   POST ?action=verbale { type, subtype, folderId } → { url }      livello ≤ 2
 * Il segreto dello script (VITE_APP_SECRET, stesso nome di oggi) lo legge solo il server: non arriva più nel browser.
 * Il regolamento passa dal server perché il browser del visitatore non contatti Google prima del consenso ai cookie.
 */
import { funzione, corpo, query, json, Errore, testo } from "./_db.js";
import { richiedi } from "./_auth.js";

const SCRIPT_URL = process.env.VITE_GOOGLE_SCRIPT_URL?.trim();
// stesso ripiego di client/src/dashboard/VerbaliAssemblea.tsx:32
const APP_SECRET = process.env.VITE_APP_SECRET || "ASSOCIAZIONE_FORO_2026";

/** solo l'esportazione in testo di un Google Doc pubblico: l'id arriva dal link del CMS */
async function regolamento(id, res) {
  if (!/^[\w-]{20,80}$/.test(id)) throw new Errore(400, "Documento non valido.");
  const r = await fetch(`https://docs.google.com/document/d/${id}/export?format=txt`).catch(() => null);
  if (!r?.ok) {
    res.setHeader("cache-control", "no-store");
    return json(res, 502, { message: "Documento non raggiungibile." });
  }
  res.statusCode = 200;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.setHeader("cache-control", "public, s-maxage=300, stale-while-revalidate=600");
  res.end(await r.text());
}

export default funzione(
  async (req, res) => {
    const { action, id } = query(req);
    if (req.method === "GET" && action === "regolamento") return regolamento(testo(id), res);
    if (req.method !== "POST" || action !== "verbale") throw new Errore(404, "Richiesta non riconosciuta.");
    await richiedi(req, 2);
    if (!SCRIPT_URL) throw new Errore(500, "Manca l'indirizzo dello script (VITE_GOOGLE_SCRIPT_URL).");
    const b = corpo(req);
    const type = testo(b.type);
    const folderId = testo(b.folderId);
    if (!type || !/^[\w-]{10,}$/.test(folderId)) throw new Errore(400, "Cartella o modello non validi.");
    // come faceva il browser: corpo JSON in text/plain, l'Apps Script risponde dopo un redirect
    const r = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type, subtype: testo(b.subtype) || "ordinaria", folderId, secret: APP_SECRET }),
    });
    const data = await r.json().catch(() => ({}));
    if (!data.url) throw new Errore(502, data.error || "Lo script di Google non ha creato il documento.");
    return { url: data.url };
  },
  { metodi: "GET, POST" },
);
