import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    setupFiles: ['./tests/mocks/setup.ts', './tests/server/api/_setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.claude/**', '.nuxt/**', '.output/**'],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.ts', 'app/**/*.vue', 'server/**/*.ts'],
      exclude: ['app/types/**', '**/*.d.ts'],
      thresholds: {
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      'mapbox-gl': fileURLToPath(new URL('./tests/mocks/mapbox-gl.ts', import.meta.url)),
      '#supabase/server': fileURLToPath(new URL('./tests/mocks/supabase-server.ts', import.meta.url)),
    },
  },
})
