import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 60000, workers: 1,
  use: { baseURL: 'http://localhost:8097', viewport: { width: 390, height: 844 } },
  webServer: { command: 'npx expo start --web --port 8097', url: 'http://localhost:8097', timeout: 120000, reuseExistingServer: false },
});
