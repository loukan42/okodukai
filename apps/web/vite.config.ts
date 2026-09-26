import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Une navigation vers /api/* (ex. /api/health) doit atteindre le serveur, pas l'app en cache.
      // push-sw.js : affichage des notifications (« Ton relevé est prêt. ») et ouverture de l'app au clic.
      // La pièce 3D de la landing (three.js) n'est pas préchargée : l'app n'en a pas besoin.
      workbox: { navigateFallbackDenylist: [/^\/api\//], importScripts: ["/push-sw.js"], globIgnores: ["**/coin3d-*.js"] },
      includeAssets: ["favicon.png"],
      manifest: {
        name: "Okodukai",
        short_name: "Okodukai",
        description: "Le premier portefeuille de votre enfant.",
        theme_color: "#1c2e4a",
        background_color: "#f5f1e6",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
