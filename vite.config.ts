import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Same-origin /api in dev so the refresh cookie works without CORS credentials juggling.
  server: { proxy: { "/api": "http://localhost:4000" } },
});
