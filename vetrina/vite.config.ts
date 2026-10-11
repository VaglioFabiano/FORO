import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, pathToFileURL, URL } from "node:url";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * In locale serve tutte le funzioni di api/ come fa Vercel in produzione: /api/<nome> → api/<nome>.js.
 * Le variabili senza prefisso VITE_ (TURSO_*, TELEGRAM_*, GMAIL_*…) arrivano da .env.development.local:
 * in sviluppo puntare SEMPRE a una copia (foro-prova o un file locale), mai al database vero.
 */
const DIR_API = fileURLToPath(new URL("./api", import.meta.url));

function apiLocale(): Plugin {
  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    const url = new URL(req.url ?? "/", "http://locale");
    const m = url.pathname.match(/^\/api\/([a-z0-9_-]+)\/?$/i);
    if (!m || m[1].startsWith("_")) return next();
    const file = readdirSync(DIR_API).find((f) => f === `${m[1]}.js`);
    if (!file) return next();
    try {
      const mod = await import(pathToFileURL(join(DIR_API, file)).href);
      const r = req as IncomingMessage & { query?: Record<string, string>; body?: unknown };
      r.query = Object.fromEntries(url.searchParams);
      if (req.method !== "GET" && req.method !== "HEAD") {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const raw = Buffer.concat(chunks).toString("utf8");
        try {
          r.body = raw ? JSON.parse(raw) : {};
        } catch {
          r.body = raw;
        }
      }
      await mod.default(r, res as ServerResponse);
    } catch (e) {
      console.error(e);
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.end(JSON.stringify({ message: String(e) }));
      }
    }
  };
  return {
    name: "foro-api-locale",
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // le funzioni leggono process.env all'import: si impostano prima
  for (const [k, v] of Object.entries(env)) if (!k.startsWith("VITE_") || k === "VITE_APP_SECRET" || k === "VITE_GOOGLE_SCRIPT_URL") process.env[k] ??= v;
  return {
    plugins: [react(), apiLocale()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { host: "127.0.0.1" },
    // caricate solo al clic (report PDF delle presenze): pre-compilate all'avvio, così il primo clic non ricarica la pagina
    optimizeDeps: { include: ["jspdf", "jspdf-autotable"] },
  };
});
