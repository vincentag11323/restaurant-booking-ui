import { defineConfig, devices } from "@playwright/test";

const PORT = 5180;

export default defineConfig({
  testDir: "tests/e2e",
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  // Mobile-only app (ui_spec.md): one phone project.
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  // UI tests mock every /api call with page.route, so no backend is needed.
  webServer: { command: `npx vite --port ${PORT} --strictPort`, url: `http://localhost:${PORT}`, reuseExistingServer: false },
});
