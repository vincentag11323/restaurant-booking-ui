import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Icons (192, 512, maskable, apple-touch, favicon) are generated from public/favicon.svg at build time.
      pwaAssets: { image: "public/favicon.svg", preset: "minimal-2023", overrideManifestIcons: true, config: false },
      manifest: {
        name: "ResortOS Dining",
        short_name: "ResortOS",
        description: "Reserve a table at ResortOS restaurants, Branch 1 and Branch 2.",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#1e4636",
        background_color: "#e4eff7",
      },
      workbox: {
        // Cache the app shell only. Bookings and availability must always be live (PRD v1).
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  // Same-origin /api in dev so the refresh cookie works without CORS credentials juggling.
  server: { proxy: { "/api": "http://localhost:4000" } },
  preview: { proxy: { "/api": "http://localhost:4000" } },
});
