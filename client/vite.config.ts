import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Qui diciamo a Vite di portarsi dietro entrambi i file
      includeAssets: ["favicon.png", "logo-app.png"],
      manifest: {
        name: "FORO",
        short_name: "FORO",
        description: "Gestionale FORO",
        theme_color: "#000000",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait",
        icons: [
          // Qui usiamo SOLO l'immagine con sfondo pieno per l'installazione
          {
            src: "/logo-app.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/logo-app.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
    }),
  ],
});
