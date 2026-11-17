import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:3100', ...devices['Pixel 7'] },
  webServer: { command: 'npm run build && npx next start -p 3100', url: 'http://localhost:3100/api/health', reuseExistingServer: true, timeout: 240_000 },
  reporter: [['list']],
});
