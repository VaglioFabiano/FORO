import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Diciamo a Vite di includere esplicitamente i file
      includeAssets: ["favicon.png", "logo-app.png"],
      manifest: {
        name: "FORO",
        short_name: "FORO",
        description: "Gestionale FORO",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait",
        icons: [
          {
            // Android userà questa (Sfondo pieno)
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
