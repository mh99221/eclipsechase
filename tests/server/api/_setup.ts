/**
 * Setup file for server API route tests.
 *
 * Provides the Nitro/H3 auto-imports that are available at runtime but
 * NOT in the Nuxt test environment (which only handles Vue auto-imports).
 *
 * Also patches `serverSupabaseServiceRole` to read from event context,
 * allowing tests to provide a mock Supabase client.
 */

// Nuxt's `useRuntimeConfig` resolves from process.env at module init
// in the test environment (auto-imported, not globalThis). Set the
// underlying env vars BEFORE any handler / runtimeConfig is touched so
// declared `runtimeConfig` keys aren't empty strings at test time.
// Real CI env vars still win — process.env assignment is a no-op if
// the var is already defined.
const TEST_ENV_DEFAULTS: Record<string, string> = {
  NUXT_STRIPE_SECRET_KEY: 'sk_test_mock',
  NUXT_STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
  NUXT_STRIPE_PRO_PRICE_ID: 'price_test_mock',
  NUXT_RESEND_API_KEY: 'test_resend_key',
  NUXT_PRO_JWT_PRIVATE_KEY: 'test_private_key',
  NUXT_ADMIN_SECRET: 'test-admin-secret',
  NUXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NUXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NUXT_PUBLIC_SUPABASE_KEY: 'test-anon-key',
}
for (const [k, v] of Object.entries(TEST_ENV_DEFAULTS)) {
  if (!process.env[k]) process.env[k] = v
}

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
// Nuxt server globals — always wrap useRuntimeConfig so test-mode mocks
// fill in fields Nuxt's test env doesn't set (Stripe / Resend / JWT /
// admin secrets). The base config wins for any key it provides, so this
// only patches gaps — never clobbers env values supplied by the test env.
// ---------------------------------------------------------------------------
const originalUseRuntimeConfig = (globalThis as any).useRuntimeConfig as
  | ((event?: any) => any)
  | undefined

;(globalThis as any).useRuntimeConfig = (event?: any) => {
  const base = originalUseRuntimeConfig ? originalUseRuntimeConfig(event) : {}
  // Mock values take precedence — Nuxt's declared `runtimeConfig` keys
  // resolve to empty strings in the test env, which would defeat the
  // mocks if `base` were spread after. (Real test-env env vars would
  // also override these; that's intentional — set them in CI if you
  // want a different value.)
  return {
    ...base,
    stripeSecretKey: 'sk_test_mock',
    stripeWebhookSecret: 'whsec_test_mock',
    stripeProPriceId: 'price_test_mock',
    resendApiKey: 'test_resend_key',
    proJwtPrivateKey: 'test_private_key',
    adminSecret: 'test-admin-secret',
    supabase: {
      ...(base?.supabase || {}),
      secretKey: 'test-supabase-secret',
      serviceKey: 'test-supabase-service',
    },
    public: {
      ...(base?.public || {}),
      siteUrl: 'http://localhost:3000',
      supabase: {
        ...(base?.public?.supabase || {}),
        url: 'https://test.supabase.co',
        key: 'test-anon-key',
      },
    },
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
import { checkRateLimit, checkDbRateLimit } from '../../../server/utils/rateLimit'
import { hashEmail, isValidEmail, maskEmail, normalizeEmail } from '../../../server/utils/email'

Object.assign(globalThis, {
  checkRateLimit,
  checkDbRateLimit,
  hashEmail,
  isValidEmail,
  maskEmail,
  normalizeEmail,
  generateProToken: vi.fn().mockResolvedValue('mock_jwt_token'),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendRestoreCode: vi.fn().mockResolvedValue(undefined),
  sendPurchaseEmail: vi.fn().mockResolvedValue(undefined),
  // requirePro is the Pro-paywall gate on cameras / traffic / horizon
  // endpoints. Tests in this directory exercise the business logic, so
  // we mock it as a pass-through. Auth-gate behaviour is covered in
  // tests targeting server/utils/proAuth.ts directly.
  requirePro: vi.fn().mockResolvedValue(null),
  verifyProToken: vi.fn().mockResolvedValue({ valid: true }),
  verifyProTokenSignature: vi.fn().mockResolvedValue({ sub: 'mock', pid: 1, tv: 1 }),
})
