import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { avviaHomepage } from "./lib/homepage";
// font serviti dal sito stesso: niente richieste a Google Fonts (e quindi niente IP a Google) prima del consenso
import "@fontsource-variable/jost/wght.css";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./styles/base.css";
import "./styles/ui.css";
import "./styles/layout.css";
import "./styles/domain.css";

avviaHomepage();

// il vecchio sito installava un service worker: se è ancora registrato in questo browser, lo si toglie (vedi public/sw.js)
navigator.serviceWorker
  ?.getRegistrations()
  .then((rs) => rs.forEach((r) => void r.unregister()))
  .catch(() => undefined);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
