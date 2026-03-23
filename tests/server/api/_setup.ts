/**
 * Setup file for server API route tests.
 *
 * Provides the Nitro/H3 auto-imports that are available at runtime but
 * NOT in the Nuxt test environment (which only handles Vue auto-imports).
 *
 * Also patches `serverSupabaseServiceRole` to read from event context,
 * allowing tests to provide a mock Supabase client.
 */
import { vi, beforeAll } from 'vitest'
import {
  defineEventHandler,
  createError,
  readBody,
  readRawBody,
  getQuery,
  getRouterParam,
  getHeader,
  setResponseStatus,
} from 'h3'

// ---------------------------------------------------------------------------
// H3 globals (Nitro auto-imports these)
// ---------------------------------------------------------------------------
Object.assign(globalThis, {
  defineEventHandler,
  createError,
  readBody,
  readRawBody,
  getQuery,
  getRouterParam,
  getHeader,
  setResponseStatus,
})

// ---------------------------------------------------------------------------
// Nuxt server globals — only set if not already defined by Nuxt test env
// ---------------------------------------------------------------------------
const existingConfig = typeof (globalThis as any).useRuntimeConfig === 'function'
  ? (globalThis as any).useRuntimeConfig()
  : null

if (!existingConfig || !existingConfig.supabase) {
  const originalUseRuntimeConfig = (globalThis as any).useRuntimeConfig
  ;(globalThis as any).useRuntimeConfig = (event?: any) => {
    const base = originalUseRuntimeConfig ? originalUseRuntimeConfig(event) : {}
    return {
      ...base,
      stripeSecretKey: 'sk_test_mock',
      stripeWebhookSecret: 'whsec_test_mock',
      resendApiKey: 'test_resend_key',
      proJwtPrivateKey: 'test_private_key',
      adminSecret: 'test-admin-secret',
      supabase: {
        secretKey: 'test-supabase-secret',
        serviceKey: 'test-supabase-service',
        ...(base?.supabase || {}),
      },
      public: {
        siteUrl: 'http://localhost:3000',
        supabase: {
          url: 'https://test.supabase.co',
          key: 'test-anon-key',
          ...(base?.public?.supabase || {}),
        },
        ...(base?.public || {}),
      },
    }
  }
}

if (typeof (globalThis as any).useStorage === 'undefined') {
  ;(globalThis as any).useStorage = () => ({
    getItem: vi.fn().mockResolvedValue(null),
  })
}

// ---------------------------------------------------------------------------
// Server util auto-imports (Nitro auto-imports everything from server/utils/)
// ---------------------------------------------------------------------------
import { checkRateLimit } from '../../../server/utils/rateLimit'
import { hashEmail, maskEmail } from '../../../server/utils/email'

Object.assign(globalThis, {
  checkRateLimit,
  hashEmail,
  maskEmail,
  generateProToken: vi.fn().mockResolvedValue('mock_jwt_token'),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendRestoreCode: vi.fn().mockResolvedValue(undefined),
})
