import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:4000";
const agentTarget = process.env.AGENT_PROXY_TARGET ?? "http://localhost:4300";
// /agent/chat → the assistant's POST /chat (src/agent-api).
const agentProxy = { target: agentTarget, rewrite: (path: string) => path.replace(/^\/agent/, "") };

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
        navigateFallbackDenylist: [/^\/api\//, /^\/agent\//],
      },
    }),
  ],
  // Same-origin /api so the session cookie works without CORS credentials juggling.
  // API_PROXY_TARGET lets the e2e run point the build at the test API (E2E_SPEC.md §2).
  server: { proxy: { "/api": apiTarget, "/agent": agentProxy } },
  preview: { proxy: { "/api": apiTarget, "/agent": agentProxy } },
});
