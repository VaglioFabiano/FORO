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

/**
 * Telefoni vecchi (iPhone 7/8 con iOS 15, Safari 15) non conoscono le container query:
 * né le unità cqi/cqw né @container. Per loro si aggiunge una copia delle regole dentro
 * `@supports not (width: 1cqi)`, con cqi/cqw → vw e @container → @media
 * (sul telefono il contenitore è largo quasi quanto lo schermo). I browser moderni la ignorano.
 */
const CQ = /(-?\d*\.?\d+)cq[iw]\b/g;
const SENZA_CQ = "not (width: 1cqi)";
type Nodo = { type: string; parent?: Nodo; name?: string; params?: string; nodes?: Nodo[]; prop?: string; value?: string; clone(o?: object): Nodo; remove(): void; removeAll(): void; after(n: Nodo): void; append(n: Nodo): void; walkDecls(cb: (d: Nodo) => void): void; walkAtRules(n: string, cb: (a: Nodo) => void): void; walkRules(cb: (r: Nodo) => void): void };
const dentroSupportsSenzaCq = (n: Nodo) => {
  for (let p = n.parent; p; p = p.parent) if (p.type === "atrule" && p.name === "supports" && p.params === SENZA_CQ) return true;
  return false;
};
const riservaContainerQuery = {
  postcssPlugin: "foro-riserva-container-query",
  OnceExit(root: Nodo, { AtRule }: { AtRule: new (o: object) => Nodo }) {
    const avvolgi = (n: Nodo) => {
      const s = new AtRule({ name: "supports", params: SENZA_CQ });
      s.append(n);
      return s;
    };
    // @container (max-width: X) → @media (max-width: X)
    root.walkAtRules("container", (a) => {
      if (dentroSupportsSenzaCq(a)) return;
      const m = a.clone({ name: "media" });
      m.walkDecls((d) => void (d.value = d.value!.replace(CQ, "$1vw")));
      a.after(avvolgi(m));
    });
    // regole con cqi/cqw: copia con solo quelle dichiarazioni, in vw
    root.walkRules((r) => {
      if (dentroSupportsSenzaCq(r) || r.parent?.name === "keyframes") return;
      const decls = (r.nodes ?? []).filter((d) => d.type === "decl" && /\dcq[iw]\b/.test(d.value!));
      if (!decls.length) return;
      const copia = r.clone();
      copia.removeAll();
      for (const d of decls) copia.append(d.clone({ value: d.value!.replace(CQ, "$1vw") }));
      r.after(avvolgi(copia));
    });
  },
};

/** iOS 15 / Safari 15: niente media query «(width<=560px)», niente sintassi JS troppo recente */
const BROWSER_VECCHI = ["es2020", "safari14", "ios14", "chrome87", "firefox78", "edge88"];

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
    css: { postcss: { plugins: [riservaContainerQuery as never] } },
    build: { target: BROWSER_VECCHI, cssTarget: BROWSER_VECCHI },
    // caricate solo al clic (report PDF delle presenze): pre-compilate all'avvio, così il primo clic non ricarica la pagina
    optimizeDeps: { include: ["jspdf", "jspdf-autotable"] },
  };
});
