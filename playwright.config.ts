import { defineConfig, devices } from "@playwright/test";

const PORT = 5180;

export default defineConfig({
  testDir: "tests/e2e",
  reporter: "list",
  // Service workers are blocked so page.route mocks see every request; pwa.spec.ts opts back in.
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", serviceWorkers: "block" },
  // Mobile-only app (ui_spec.md): one phone project.
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  // Tests run against the production build (the service worker only exists there).
  // UI tests mock every /api call with page.route, so no backend is needed.
  webServer: { command: `npm run build && npx vite preview --port ${PORT} --strictPort`, url: `http://localhost:${PORT}`, reuseExistingServer: false, timeout: 120_000 },
});
