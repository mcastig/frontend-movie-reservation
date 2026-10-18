import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against the local API with seed data (`npm run db:seed`
// in the API repo): showtime 1 is in Hall 1, and seat 9 is B1.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        env: { VITE_API_URL: process.env.E2E_API_URL ?? 'http://localhost:3000' },
      },
})
