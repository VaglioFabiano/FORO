import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Analytics } from "@vercel/analytics/react";

// Inietta automaticamente l'header Authorization su tutte le chiamate /api/
const _origFetch = window.fetch.bind(window);
window.fetch = function (input: RequestInfo | URL, init: RequestInit = {}) {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url;
  if (url.startsWith("/api/")) {
    try {
      const userStr = localStorage.getItem("user");
      const token = localStorage.getItem("sessionToken");
      if (userStr && token) {
        const userId = JSON.parse(userStr).id;
        init = {
          ...init,
          headers: {
            ...((init.headers as Record<string, string>) || {}),
            Authorization: `Bearer ${userId}:${token}`,
          },
        };
      }
    } catch {
      // Ignora errori di parsing localStorage
    }
  }
  return _origFetch(input, init);
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
