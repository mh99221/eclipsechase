import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

export default defineConfig<ConfigOptions>({
  use: {
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
      dotenv: { fileName: '.env.test' },
    },
  },
  testDir: './tests/e2e',
  // Run serially — each test file starts a Nuxt production build + server
  workers: 1,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: 1,
  // Individual test timeout
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
})
