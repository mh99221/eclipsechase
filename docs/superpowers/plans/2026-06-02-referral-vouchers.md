# Referral Program & Price Vouchers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a member-gets-member referral program (friend gets 20% off, member gets €4 back) for EclipseChase Pro, built on a generic voucher layer that also supports hand-minted press/influencer codes.

**Architecture:** A generic `vouchers` table maps human codes → reusable Stripe Coupons; a referral code is just a `kind='referral'` voucher with a `referrer_id`. The discount applies at Stripe Checkout; the €4 referrer reward is a partial refund issued from the *friend's* `checkout.session.completed` webhook. Stripe's hard refund ceiling (≤ original charge) is the only cap. Money-movement logic lives in focused, unit-tested server utils (`vouchers.ts`, `referralPayout.ts`) so it can be tested without the full webhook.

**Tech Stack:** Nuxt 4 (Nitro server routes), Supabase (Postgres), Stripe (Checkout + Refunds), Resend (email), jose (RS256 JWT), Vitest.

**Branch:** `feat/referral-vouchers` (already created; spec committed).

---

## File Structure

**Create:**
- `scripts/migrations/018-referral-vouchers.sql` — schema: 2 columns on `pro_purchases`, `vouchers` + `voucher_redemptions` tables, redeemed-count trigger, backfill.
- `server/utils/vouchers.ts` — constants, `generateReferralCode`, `isVoucherUsable`, `lookupUsableVoucher`, `assignReferralCode`.
- `server/utils/referralPayout.ts` — `processReferralRedemption` (refund + redemption recording).
- `server/api/vouchers/validate.post.ts` — public code-validation endpoint.
- `server/api/referral/me.post.ts` — Pro-gated; returns the member's code, link, and tally.
- `app/components/ReferralCard.vue` — `/me` referral card.
- `scripts/mint-voucher.mjs` — CLI to mint manual press/influencer codes.
- Tests: `tests/unit/utils/vouchers.test.ts`, `tests/server/api/vouchers-validate.test.ts`, `tests/server/api/referral-me.test.ts`, `tests/server/api/stripe/checkout.test.ts`, `tests/server/utils/referralPayout.test.ts`, `tests/components/ReferralCard.test.ts`.

**Modify:**
- `server/api/stripe/checkout.post.ts` — accept + validate `voucher_code`, attach coupon + metadata.
- `server/api/stripe/webhook.post.ts` — store `payment_intent_id`, assign referral code on first write, call `processReferralRedemption`.
- `server/utils/email.ts` — add `sendReferralRewardEmail`; add referral link to purchase email.
- `nuxt.config.ts` — add `stripeReferralCouponId` runtimeConfig key.
- `.env.example` — document `NUXT_STRIPE_REFERRAL_COUPON_ID`.
- `tests/server/api/_setup.ts` — add config key + `sendReferralRewardEmail` mock.
- `app/pages/me.vue` — render `<ReferralCard>` when Pro.
- `app/pages/pro/index.vue` — `?ref=` handling, "Have a code?" input, discount banner, pass `voucher_code` to checkout.
- `i18n/en.json`, `i18n/is.json` — new keys.

---

## Task 1: Database migration + config wiring

**Files:**
- Create: `scripts/migrations/018-referral-vouchers.sql`
- Modify: `nuxt.config.ts:212-231`, `.env.example`, `tests/server/api/_setup.ts:17-27` and `:75-97` and `:112-130`

- [ ] **Step 1: Write the migration SQL**

Create `scripts/migrations/018-referral-vouchers.sql`:

```sql
-- 018: Referral program + generic voucher layer.
-- Friend gets a discount (Stripe Coupon); member gets a €4 partial refund.

-- pro_purchases: capture the PaymentIntent (for refunds) + each buyer's
-- own shareable referral code.
ALTER TABLE pro_purchases ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE pro_purchases ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Generic discount-code layer. A referral code is a kind='referral' row
-- with referrer_id set; a manual press code is kind='manual', referrer_id NULL.
CREATE TABLE IF NOT EXISTS vouchers (
  code TEXT PRIMARY KEY,
  stripe_coupon_id TEXT NOT NULL,
  discount_percent INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('referral','manual')),
  referrer_id BIGINT REFERENCES pro_purchases(id),
  max_redemptions INTEGER,
  redeemed_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per successful redemption. referee_session_id UNIQUE is the
-- double-payout guard (webhook deliveries retry).
CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id BIGSERIAL PRIMARY KEY,
  voucher_code TEXT NOT NULL REFERENCES vouchers(code),
  referee_session_id TEXT NOT NULL UNIQUE,
  referee_purchase_id BIGINT REFERENCES pro_purchases(id),
  reward_status TEXT NOT NULL DEFAULT 'none'
    CHECK (reward_status IN ('none','paid','failed')),
  reward_cents INTEGER NOT NULL DEFAULT 0,
  stripe_refund_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_code ON voucher_redemptions(voucher_code);

-- Atomic redeemed_count bump: inserting a redemption increments its voucher.
CREATE OR REPLACE FUNCTION bump_voucher_redeemed() RETURNS TRIGGER AS $$
BEGIN
  UPDATE vouchers SET redeemed_count = redeemed_count + 1 WHERE code = NEW.voucher_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_voucher_redeemed ON voucher_redemptions;
CREATE TRIGGER trg_bump_voucher_redeemed
  AFTER INSERT ON voucher_redemptions
  FOR EACH ROW EXECUTE FUNCTION bump_voucher_redeemed();
```

> Backfill of `referral_code` for pre-existing purchases is handled lazily by `/api/referral/me` (Task 8) — no SQL backfill needed, which keeps the migration purely additive.

- [ ] **Step 2: Apply the migration to Supabase**

This repo applies migrations manually. Run the SQL in the Supabase SQL editor (or `psql "$SUPABASE_DB_URL" -f scripts/migrations/018-referral-vouchers.sql`).
Expected: no errors; `\d vouchers` and `\d voucher_redemptions` show the tables. (Tests use a mock Supabase client and do not require the live schema.)

- [ ] **Step 3: Add the runtimeConfig key**

In `nuxt.config.ts`, inside `runtimeConfig` (after line 215 `stripeProPriceId: '',`), add:

```ts
    stripeReferralCouponId: '',
```

- [ ] **Step 4: Document the env var**

In `.env.example`, under the Stripe block, add:

```
# Shared 20%-off Stripe Coupon ID used for all referral discounts.
# Create once in the Stripe dashboard (Products → Coupons → 20% off, once).
# NUXT_STRIPE_REFERRAL_COUPON_ID=
```

- [ ] **Step 5: Wire the test env defaults**

In `tests/server/api/_setup.ts`, add to `TEST_ENV_DEFAULTS` (after line 20):

```ts
  NUXT_STRIPE_REFERRAL_COUPON_ID: 'coup_referral_mock',
```

In the `useRuntimeConfig` override object (after line 79 `stripeProPriceId: 'price_test_mock',`), add:

```ts
    stripeReferralCouponId: 'coup_referral_mock',
```

In the `Object.assign(globalThis, { ... })` server-util mock block (after line 122 `sendPurchaseEmail: ...`), add:

```ts
  sendReferralRewardEmail: vi.fn().mockResolvedValue(undefined),
```

- [ ] **Step 6: Commit**

```bash
git add scripts/migrations/018-referral-vouchers.sql nuxt.config.ts .env.example tests/server/api/_setup.ts
git commit -m "feat(referral): migration 018 + config for vouchers"
```

---

## Task 2: Voucher pure helpers (`vouchers.ts`)

**Files:**
- Create: `server/utils/vouchers.ts`
- Test: `tests/unit/utils/vouchers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/utils/vouchers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  generateReferralCode,
  isVoucherUsable,
  REFERRAL_REWARD_CENTS,
  REFERRAL_DISCOUNT_PERCENT,
  type VoucherRow,
} from '../../../server/utils/vouchers'

function voucher(overrides: Partial<VoucherRow> = {}): VoucherRow {
  return {
    code: 'ABCD2345',
    stripe_coupon_id: 'coup_x',
    discount_percent: 20,
    kind: 'referral',
    referrer_id: 1,
    max_redemptions: null,
    redeemed_count: 0,
    active: true,
    expires_at: null,
    ...overrides,
  }
}

describe('referral constants', () => {
  it('reward is €4.00 and discount is 20%', () => {
    expect(REFERRAL_REWARD_CENTS).toBe(400)
    expect(REFERRAL_DISCOUNT_PERCENT).toBe(20)
  })
})

describe('generateReferralCode', () => {
  it('returns 8 chars from the unambiguous alphabet', () => {
    const code = generateReferralCode()
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
  })
  it('produces distinct codes across calls', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateReferralCode()))
    expect(codes.size).toBeGreaterThan(45)
  })
})

describe('isVoucherUsable', () => {
  const now = new Date('2026-06-01T00:00:00Z')
  it('true for an active, unexpired, unredeemed voucher', () => {
    expect(isVoucherUsable(voucher(), now)).toBe(true)
  })
  it('false for null', () => {
    expect(isVoucherUsable(null, now)).toBe(false)
  })
  it('false when inactive', () => {
    expect(isVoucherUsable(voucher({ active: false }), now)).toBe(false)
  })
  it('false when expired', () => {
    expect(isVoucherUsable(voucher({ expires_at: '2026-05-01T00:00:00Z' }), now)).toBe(false)
  })
  it('false when max redemptions reached', () => {
    expect(isVoucherUsable(voucher({ max_redemptions: 2, redeemed_count: 2 }), now)).toBe(false)
  })
  it('true when under max redemptions', () => {
    expect(isVoucherUsable(voucher({ max_redemptions: 2, redeemed_count: 1 }), now)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/vouchers.test.ts`
Expected: FAIL — cannot find module `server/utils/vouchers`.

- [ ] **Step 3: Write minimal implementation**

Create `server/utils/vouchers.ts`:

```ts
import { randomInt } from 'crypto'

export const REFERRAL_REWARD_CENTS = 400
export const REFERRAL_DISCOUNT_PERCENT = 20

// Unambiguous alphabet (no 0/O/1/I) for human-shareable codes.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export interface VoucherRow {
  code: string
  stripe_coupon_id: string
  discount_percent: number
  kind: 'referral' | 'manual'
  referrer_id: number | null
  max_redemptions: number | null
  redeemed_count: number
  active: boolean
  expires_at: string | null
}

export function generateReferralCode(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return out
}

export function isVoucherUsable(v: VoucherRow | null, now: Date = new Date()): boolean {
  if (!v || !v.active) return false
  if (v.expires_at && new Date(v.expires_at).getTime() <= now.getTime()) return false
  if (v.max_redemptions != null && v.redeemed_count >= v.max_redemptions) return false
  return true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/utils/vouchers.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add server/utils/vouchers.ts tests/unit/utils/vouchers.test.ts
git commit -m "feat(referral): voucher constants + pure helpers"
```

---

## Task 3: Voucher DB helpers — `lookupUsableVoucher`, `assignReferralCode`

**Files:**
- Modify: `server/utils/vouchers.ts`
- Test: `tests/unit/utils/vouchers.test.ts` (append a `describe` block)

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/utils/vouchers.test.ts`:

```ts
import { vi } from 'vitest'
import { lookupUsableVoucher, assignReferralCode } from '../../../server/utils/vouchers'
import { createMockSupabase } from '../../server/api/_helpers'

describe('lookupUsableVoucher', () => {
  it('upper-cases + trims the code and returns the row when usable', async () => {
    const { client, setResult } = createMockSupabase()
    setResult(voucher({ code: 'ABCD2345' }))
    const v = await lookupUsableVoucher(client, '  abcd2345 ')
    expect(client.from).toHaveBeenCalledWith('vouchers')
    expect(client.eq).toHaveBeenCalledWith('code', 'ABCD2345')
    expect(v?.code).toBe('ABCD2345')
  })
  it('returns null when the voucher is not usable', async () => {
    const { client, setResult } = createMockSupabase()
    setResult(voucher({ active: false }))
    expect(await lookupUsableVoucher(client, 'ABCD2345')).toBeNull()
  })
  it('returns null when no row found', async () => {
    const { client, setResult } = createMockSupabase()
    setResult(null)
    expect(await lookupUsableVoucher(client, 'NOPE0000')).toBeNull()
  })
})

describe('assignReferralCode', () => {
  it('claims a code on the purchase row and inserts the matching voucher', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults({ data: { referral_code: 'WXYZ6789' } }) // update().is(null) claim wins
    const code = await assignReferralCode(client, 42, 'coup_ref')
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
    expect(client.from).toHaveBeenCalledWith('pro_purchases')
    expect(client.from).toHaveBeenCalledWith('vouchers')
    expect(client.insert).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'referral', referrer_id: 42, stripe_coupon_id: 'coup_ref', discount_percent: 20,
    }))
  })
  it('returns the existing code when another writer already set one', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: null },                              // our claim updates 0 rows
      { data: { referral_code: 'EXISTING1' } },    // read-back finds concurrent code
    )
    const code = await assignReferralCode(client, 42, 'coup_ref')
    expect(code).toBe('EXISTING1')
    expect(client.insert).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/vouchers.test.ts`
Expected: FAIL — `lookupUsableVoucher` / `assignReferralCode` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `server/utils/vouchers.ts`:

```ts
const VOUCHER_COLUMNS =
  'code, stripe_coupon_id, discount_percent, kind, referrer_id, max_redemptions, redeemed_count, active, expires_at'

/** Fetch a voucher by (normalised) code and return it only if usable. */
export async function lookupUsableVoucher(supabase: any, rawCode: string): Promise<VoucherRow | null> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return null
  const { data } = await supabase.from('vouchers').select(VOUCHER_COLUMNS).eq('code', code).maybeSingle()
  return isVoucherUsable(data as VoucherRow | null) ? (data as VoucherRow) : null
}

/**
 * Assign a unique referral code to a purchase (idempotent) and create the
 * matching kind='referral' voucher row. Safe under concurrent webhook
 * deliveries: the `.is('referral_code', null)` claim means only the first
 * writer sets it; losers read back the winner's code.
 */
export async function assignReferralCode(supabase: any, purchaseId: number, couponId: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode()
    const { data: claimed } = await supabase
      .from('pro_purchases')
      .update({ referral_code: code })
      .eq('id', purchaseId)
      .is('referral_code', null)
      .select('referral_code')
      .maybeSingle()

    if (claimed?.referral_code) {
      await supabase.from('vouchers').insert({
        code,
        stripe_coupon_id: couponId,
        discount_percent: REFERRAL_DISCOUNT_PERCENT,
        kind: 'referral',
        referrer_id: purchaseId,
      })
      return code
    }

    // Either a concurrent writer already set a code, or our generated code
    // collided. Read back: if a code now exists, we're done; else retry.
    const { data: existing } = await supabase
      .from('pro_purchases').select('referral_code').eq('id', purchaseId).maybeSingle()
    if (existing?.referral_code) return existing.referral_code
  }
  throw new Error('Failed to assign referral code after retries')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/utils/vouchers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/vouchers.ts tests/unit/utils/vouchers.test.ts
git commit -m "feat(referral): voucher lookup + referral-code assignment helpers"
```

---

## Task 4: `POST /api/vouchers/validate`

**Files:**
- Create: `server/api/vouchers/validate.post.ts`
- Test: `tests/server/api/vouchers-validate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/server/api/vouchers-validate.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from './_helpers'

const { client: mockSupabase, setResult } = createMockSupabase()
const { default: handler } = await import('../../../server/api/vouchers/validate.post')

describe('POST /api/vouchers/validate', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws 400 when code is missing', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: {} })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns valid + discount for a usable voucher', async () => {
    setResult({
      code: 'ABCD2345', stripe_coupon_id: 'coup_x', discount_percent: 20,
      kind: 'referral', referrer_id: 1, max_redemptions: null, redeemed_count: 0,
      active: true, expires_at: null,
    })
    const event = createTestEvent({ supabase: mockSupabase, body: { code: 'abcd2345' } })
    const result = await handler(event)
    expect(result).toEqual({ valid: true, discount_percent: 20, kind: 'referral' })
  })

  it('returns { valid: false } for an unknown code', async () => {
    setResult(null)
    const event = createTestEvent({ supabase: mockSupabase, body: { code: 'NOPE0000' } })
    expect(await handler(event)).toEqual({ valid: false })
  })

  it('returns { valid: false } for an inactive voucher', async () => {
    setResult({
      code: 'OFF00000', stripe_coupon_id: 'c', discount_percent: 20, kind: 'manual',
      referrer_id: null, max_redemptions: null, redeemed_count: 0, active: false, expires_at: null,
    })
    const event = createTestEvent({ supabase: mockSupabase, body: { code: 'OFF00000' } })
    expect(await handler(event)).toEqual({ valid: false })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/api/vouchers-validate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `server/api/vouchers/validate.post.ts`:

```ts
import { serverSupabaseServiceRole } from '#supabase/server'
import { lookupUsableVoucher } from '../../utils/vouchers'

// Public, low-stakes endpoint (the discount alone triggers no payout —
// payouts are guarded in the webhook). In-memory rate-limit per code is
// enough to blunt brute-force enumeration of codes.
export default defineEventHandler(async (event) => {
  const { code } = await readBody<{ code?: string }>(event).catch(() => ({ code: undefined }))

  if (!code || typeof code !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'code is required' })
  }

  const normalized = code.trim().toUpperCase()
  if (!checkRateLimit(`voucher-validate:${normalized}`, 20, 60 * 1000)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Try again later.' })
  }

  const supabase = await serverSupabaseServiceRole(event)
  const voucher = await lookupUsableVoucher(supabase, normalized)
  if (!voucher) return { valid: false }

  return { valid: true, discount_percent: voucher.discount_percent, kind: voucher.kind }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/server/api/vouchers-validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/vouchers/validate.post.ts tests/server/api/vouchers-validate.test.ts
git commit -m "feat(referral): voucher validation endpoint"
```

---

## Task 5: Checkout attaches the voucher discount

**Files:**
- Modify: `server/api/stripe/checkout.post.ts`
- Test: `tests/server/api/stripe/checkout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/server/api/stripe/checkout.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase, setResult } = createMockSupabase()
const mockCreate = vi.fn()

vi.mock('stripe', () => {
  function MockStripe() {
    return { checkout: { sessions: { create: (...a: any[]) => mockCreate(...a) } } }
  }
  return { default: MockStripe }
})

const { default: handler } = await import('../../../../server/api/stripe/checkout.post')

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ url: 'https://stripe.test/session' })
  })

  it('creates a session with no discount when no voucher_code', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'a@b.com' } })
    const result = await handler(event)
    expect(result.url).toBe('https://stripe.test/session')
    const arg = mockCreate.mock.calls[0][0]
    expect(arg.discounts).toBeUndefined()
    expect(arg.metadata).toEqual({ product: 'eclipse_pro_2026' })
  })

  it('attaches the coupon + referrer metadata for a usable referral voucher', async () => {
    setResult({
      code: 'ABCD2345', stripe_coupon_id: 'coup_x', discount_percent: 20,
      kind: 'referral', referrer_id: 7, max_redemptions: null, redeemed_count: 0,
      active: true, expires_at: null,
    })
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'a@b.com', voucher_code: 'abcd2345' } })
    await handler(event)
    const arg = mockCreate.mock.calls[0][0]
    expect(arg.discounts).toEqual([{ coupon: 'coup_x' }])
    expect(arg.metadata).toEqual({ product: 'eclipse_pro_2026', voucher_code: 'ABCD2345', referrer_id: '7' })
  })

  it('ignores an unusable voucher and charges full price', async () => {
    setResult(null)
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'a@b.com', voucher_code: 'NOPE0000' } })
    await handler(event)
    const arg = mockCreate.mock.calls[0][0]
    expect(arg.discounts).toBeUndefined()
    expect(arg.metadata).toEqual({ product: 'eclipse_pro_2026' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/api/stripe/checkout.test.ts`
Expected: FAIL — discounts/metadata assertions fail (current handler ignores `voucher_code`).

- [ ] **Step 3: Write the implementation**

Replace the body of `server/api/stripe/checkout.post.ts` with:

```ts
import Stripe from 'stripe'
import { serverSupabaseServiceRole } from '#supabase/server'
import { lookupUsableVoucher } from '../../utils/vouchers'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey)

  if (!config.stripeProPriceId) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe Price ID is not configured' })
  }

  const body = await readBody<{ email?: string; voucher_code?: string }>(event)
    .catch(() => ({} as { email?: string; voucher_code?: string }))
  const customerEmail = body?.email && isValidEmail(body.email) ? normalizeEmail(body.email) : undefined

  const metadata: Record<string, string> = { product: 'eclipse_pro_2026' }
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined

  // Re-validate the voucher server-side — never trust the client's claim
  // that a code is valid (it sets the discount AND the payout target).
  if (body?.voucher_code) {
    const supabase = await serverSupabaseServiceRole(event)
    const voucher = await lookupUsableVoucher(supabase, body.voucher_code)
    if (voucher) {
      discounts = [{ coupon: voucher.stripe_coupon_id }]
      metadata.voucher_code = voucher.code
      if (voucher.referrer_id != null) metadata.referrer_id = String(voucher.referrer_id)
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: config.stripeProPriceId, quantity: 1 }],
    customer_email: customerEmail,
    ...(discounts ? { discounts } : {}),
    metadata,
    success_url: `${config.public.siteUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.public.siteUrl}/pro?cancelled=true`,
  })

  return { url: session.url }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/server/api/stripe/checkout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/stripe/checkout.post.ts tests/server/api/stripe/checkout.test.ts
git commit -m "feat(referral): attach voucher discount + metadata at checkout"
```

---

## Task 6: Referral payout helper (`referralPayout.ts`)

This is the core money-movement logic. Test every branch.

**Files:**
- Create: `server/utils/referralPayout.ts`
- Test: `tests/server/utils/referralPayout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/server/utils/referralPayout.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase } from '../api/_helpers'
import { hashEmail } from '../../../server/utils/email'
import { processReferralRedemption } from '../../../server/utils/referralPayout'

function makeStripe(refundImpl: any) {
  return { refunds: { create: vi.fn().mockImplementation(refundImpl) } } as any
}

describe('processReferralRedemption', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('records the redemption and refunds €4 to the referrer on the happy path', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 99 } },                                              // redemption insert (no conflict)
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } },  // voucher lookup
      { data: { payment_intent_id: 'pi_123', email_hash: hashEmail('referrer@x.com') } }, // referrer row
      { data: { id: 99 } },                                              // redemption update -> paid
    )
    const stripe = makeStripe(async () => ({ id: 're_1' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_friend', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result).toBe('paid')
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: 'pi_123', amount: 400 },
      { idempotencyKey: 'referral-refund-cs_friend' },
    )
    expect(client.from).toHaveBeenCalledWith('voucher_redemptions')
  })

  it('is a no-op when the redemption already exists (unique violation)', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults({ data: null, error: { code: '23505' } }) // insert hits unique constraint
    const stripe = makeStripe(async () => ({ id: 're_x' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_dupe', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result).toBe('duplicate')
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  it('does not refund a manual (non-referral) voucher', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 1 } },                                          // insert ok
      { data: { code: 'ICELAND26', kind: 'manual', referrer_id: null } },
    )
    const stripe = makeStripe(async () => ({ id: 're_x' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_manual', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ICELAND26',
    })

    expect(result).toBe('none')
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  it('does NOT pay a self-referral (referee email == referrer email)', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 1 } },
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } },
      { data: { payment_intent_id: 'pi_123', email_hash: hashEmail('cheater@x.com') } },
    )
    const stripe = makeStripe(async () => ({ id: 're_x' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_self', refereePurchaseId: 12, refereeEmail: 'cheater@x.com', voucherCode: 'ABCD2345',
    })

    expect(result).toBe('none')
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  it('marks failed (no throw) when the refund errors', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 1 } },
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } },
      { data: { payment_intent_id: 'pi_old', email_hash: hashEmail('referrer@x.com') } },
    )
    const stripe = makeStripe(async () => { throw new Error('charge too old to refund') })

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_fail', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result).toBe('failed')
  })

  it('marks failed when the referrer has no payment_intent_id', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 1 } },
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } },
      { data: { payment_intent_id: null, email_hash: hashEmail('referrer@x.com') } },
    )
    const stripe = makeStripe(async () => ({ id: 're_x' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_nopi', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result).toBe('failed')
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/utils/referralPayout.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `server/utils/referralPayout.ts`:

```ts
import type Stripe from 'stripe'
import { REFERRAL_REWARD_CENTS } from './vouchers'
import { hashEmail } from './email'

export type ReferralOutcome = 'paid' | 'none' | 'failed' | 'duplicate'

export interface RedemptionInput {
  sessionId: string        // the FRIEND's checkout session id (idempotency key)
  refereePurchaseId: number
  refereeEmail: string
  voucherCode: string
  refereeLocale?: string | null
}

/**
 * Record a voucher redemption and, for referral vouchers, refund €4 to the
 * referrer's original card. Idempotent: the UNIQUE(referee_session_id)
 * constraint makes a webhook retry a no-op ('duplicate'). Never throws —
 * refund errors are recorded as 'failed' for manual follow-up.
 */
export async function processReferralRedemption(
  stripe: Stripe,
  supabase: any,
  input: RedemptionInput,
): Promise<ReferralOutcome> {
  // 1. Record the redemption. Unique session id => retry is a no-op.
  const { data: inserted, error: insertError } = await supabase
    .from('voucher_redemptions')
    .insert({
      voucher_code: input.voucherCode,
      referee_session_id: input.sessionId,
      referee_purchase_id: input.refereePurchaseId,
      reward_status: 'none',
      reward_cents: 0,
    })
    .select('id')
    .maybeSingle()

  if (insertError) {
    // 23505 = unique_violation: already processed on a prior delivery.
    if ((insertError as any).code === '23505') return 'duplicate'
    console.error('[referral] redemption insert failed:', insertError)
    return 'failed'
  }
  const redemptionId = inserted?.id

  // 2. Resolve the voucher. Only referral vouchers with a referrer pay out.
  const { data: voucher } = await supabase
    .from('vouchers').select('code, kind, referrer_id').eq('code', input.voucherCode).maybeSingle()
  if (!voucher || voucher.kind !== 'referral' || voucher.referrer_id == null) return 'none'

  // 3. Load the referrer; guard self-referral and missing PaymentIntent.
  const { data: referrer } = await supabase
    .from('pro_purchases').select('payment_intent_id, email_hash').eq('id', voucher.referrer_id).maybeSingle()
  if (!referrer) return 'none'
  if (referrer.email_hash === hashEmail(input.refereeEmail)) return 'none' // self-referral

  if (!referrer.payment_intent_id) {
    await markRedemption(supabase, redemptionId, 'failed', 0, null)
    return 'failed'
  }

  // 4. Issue the partial refund (idempotent on the friend's session id).
  try {
    const refund = await stripe.refunds.create(
      { payment_intent: referrer.payment_intent_id, amount: REFERRAL_REWARD_CENTS },
      { idempotencyKey: `referral-refund-${input.sessionId}` },
    )
    await markRedemption(supabase, redemptionId, 'paid', REFERRAL_REWARD_CENTS, refund.id)
    return 'paid'
  } catch (err: any) {
    console.error('[referral] refund failed for', input.voucherCode, ':', err?.message || err)
    await markRedemption(supabase, redemptionId, 'failed', 0, null)
    return 'failed'
  }
}

async function markRedemption(
  supabase: any, id: number | undefined, status: 'paid' | 'failed', cents: number, refundId: string | null,
): Promise<void> {
  if (id == null) return
  await supabase.from('voucher_redemptions')
    .update({ reward_status: status, reward_cents: cents, stripe_refund_id: refundId })
    .eq('id', id)
}
```

> Note: the referrer-reward email is sent by the webhook (Task 7) on a `'paid'` outcome, not here — keeping this helper's DB/Stripe responsibilities focused and its tests free of email mocking.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/server/utils/referralPayout.test.ts`
Expected: PASS (all six cases).

- [ ] **Step 5: Commit**

```bash
git add server/utils/referralPayout.ts tests/server/utils/referralPayout.test.ts
git commit -m "feat(referral): payout helper — refund + redemption recording"
```

---

## Task 7: Webhook — store PaymentIntent, assign referral code, process payout

**Files:**
- Modify: `server/api/stripe/webhook.post.ts`
- Test: `tests/server/api/stripe/webhook.test.ts` (extend)

**Canonical DB-call order** (the payout runs *before* the activation-token retry short-circuit, so a retry that lands after a crash can never skip an un-run payout; the `UNIQUE(referee_session_id)` constraint makes the repeat a no-op):

1. upsert (now includes `payment_intent_id`)
2. select existing → `{id, token_version, activation_token}`
3. **payout block** (only if `session.metadata.voucher_code`): redemption insert → voucher lookup → referrer select → redemption update → (on `paid`) referrer-email select
4. `if (existing.activation_token) return` — retry short-circuit (payout already done above)
5. mint token (no DB) → conditional `activation_token` update
6. `if (updated)`: assign referral code (claim + voucher insert) → send purchase email (with link)

- [ ] **Step 1: Write the failing tests**

Add to `tests/server/api/stripe/webhook.test.ts`. First extend the Stripe mock at the top so refunds exist — replace the existing `vi.mock('stripe', ...)` block (lines 7-14) with:

```ts
const mockRefundCreate = vi.fn().mockResolvedValue({ id: 're_1' })
vi.mock('stripe', () => {
  function MockStripe() {
    return {
      webhooks: { constructEvent: (...args: any[]) => mockConstructEvent(...args) },
      refunds: { create: (...args: any[]) => mockRefundCreate(...args) },
    }
  }
  return { default: MockStripe }
})
```

Then add these tests inside the `describe`:

```ts
it('stores payment_intent_id and assigns a referral code on first write', async () => {
  queueResults(
    { data: null },                                                 // 1 upsert
    { data: { id: 42, token_version: 1, activation_token: null } }, // 2 post-upsert select
    // (no payout: no voucher_code)
    { data: { id: 42 } },                                           // 5 conditional token update wins
    { data: { locale: 'en' } },                                     // 6 email_signups locale lookup
    { data: { referral_code: 'NEWCODE1' } },                        // 6 assignReferralCode claim
    { data: null },                                                 // 6 vouchers insert
  )
  mockConstructEvent.mockReturnValue({
    type: 'checkout.session.completed',
    data: { object: {
      id: 'cs_buyer', payment_status: 'paid', payment_intent: 'pi_buyer',
      customer_details: { email: 'buyer@test.com' },
      metadata: { product: 'eclipse_pro_2026' },
    } },
  })
  const event = createTestEvent({ supabase: mockSupabase, rawBody: 'b', headers: { 'stripe-signature': 'valid' } })
  const result = await handler(event)
  expect(result.received).toBe(true)
  expect(mockSupabase.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ payment_intent_id: 'pi_buyer' }),
    expect.anything(),
  )
})

it('processes a referral payout when the friend used a referral voucher', async () => {
  queueResults(
    { data: null },                                                 // 1 upsert
    { data: { id: 50, token_version: 1, activation_token: null } }, // 2 select existing
    { data: { id: 1 } },                                            // 3 redemption insert
    { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } }, // 3 voucher lookup
    { data: { payment_intent_id: 'pi_ref', email_hash: 'differenthash' } }, // 3 referrer select
    { data: { id: 1 } },                                            // 3 redemption update -> paid
    { data: { email: 'ref@x.com', id: 7 } },                        // 3 referrer-email select (paid)
    { data: { id: 50 } },                                           // 5 conditional token update wins
    { data: { locale: 'en' } },                                     // 6 email_signups locale lookup
    { data: { referral_code: 'FRIENDCD' } },                        // 6 assignReferralCode claim
    { data: null },                                                 // 6 vouchers insert
  )
  mockConstructEvent.mockReturnValue({
    type: 'checkout.session.completed',
    data: { object: {
      id: 'cs_friend', payment_status: 'paid', payment_intent: 'pi_friend',
      customer_details: { email: 'friend@test.com' },
      metadata: { product: 'eclipse_pro_2026', voucher_code: 'ABCD2345', referrer_id: '7' },
    } },
  })
  const event = createTestEvent({ supabase: mockSupabase, rawBody: 'b', headers: { 'stripe-signature': 'valid' } })
  const result = await handler(event)
  expect(result.received).toBe(true)
  expect(mockRefundCreate).toHaveBeenCalledWith(
    { payment_intent: 'pi_ref', amount: 400 },
    { idempotencyKey: 'referral-refund-cs_friend' },
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/server/api/stripe/webhook.test.ts`
Expected: FAIL — `payment_intent_id` not in upsert; refund not called.

- [ ] **Step 3: Implement webhook changes**

In `server/api/stripe/webhook.post.ts`:

(a) Add imports at the top (after line 2):

```ts
import { assignReferralCode } from '../../utils/vouchers'
import { processReferralRedemption } from '../../utils/referralPayout'
```

(b) Add `payment_intent_id` to the upsert payload (currently lines 50-57):

```ts
        {
          email: normalizedEmail,
          email_hash: emailHash,
          stripe_session_id: session.id,
          payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          activation_token: null,
          purchased_at: new Date().toISOString(),
          is_active: true,
        },
```

(c) Insert the **payout block** immediately AFTER the `if (selectError || !existing) { throw ... }` guard (currently ends at line 70) and BEFORE the `if (existing.activation_token) { return ... }` retry short-circuit (currently line 72). This placement guarantees the payout is attempted on every delivery and is never skipped by the retry short-circuit; idempotency comes from the `UNIQUE(referee_session_id)` constraint:

```ts
    // If THIS purchase used a referral/manual voucher, record the
    // redemption and (for referral codes) refund the referrer. Runs before
    // the activation_token retry short-circuit so a retry after a partial
    // first delivery still completes the payout. Idempotent via
    // UNIQUE(referee_session_id) — a true repeat returns 'duplicate'.
    if (session.metadata?.voucher_code) {
      const outcome = await processReferralRedemption(stripe, supabase, {
        sessionId: session.id,
        refereePurchaseId: existing.id,
        refereeEmail: normalizedEmail,
        voucherCode: session.metadata.voucher_code,
      })
      if (outcome === 'paid') {
        const { data: referrer } = await supabase
          .from('pro_purchases').select('email, id')
          .eq('referral_code', session.metadata.voucher_code).maybeSingle()
        if (referrer?.email) {
          await sendReferralRewardEmail(referrer.email, null, { amountEur: 4 })
        }
      }
    }
```

> `sendReferralRewardEmail` is auto-imported from `server/utils/email.ts` (Nitro auto-imports `server/utils`), matching how `sendPurchaseEmail` is already called unqualified.

(d) Inside the `if (updated) { ... }` first-writer block (currently lines 93-106), assign the referral code and thread its link into the purchase email. Replace the existing `await sendPurchaseEmail(normalizedEmail, locale)` call (and the lines that compute `locale`) so the block reads:

```ts
      const { data: signup } = await supabase
        .from('email_signups')
        .select('locale')
        .eq('email', normalizedEmail)
        .maybeSingle()
      const locale = signup?.locale || session.locale || 'en'

      // Give this buyer their own shareable referral code + voucher row.
      // Reuse the `config` already declared at the top of the handler
      // (line 5) — do NOT redeclare it here.
      let referralLink: string | undefined
      try {
        const code = await assignReferralCode(supabase, existing.id, config.stripeReferralCouponId)
        referralLink = `${config.public.siteUrl}/pro?ref=${code}`
      } catch (err) {
        console.error('[referral] failed to assign code for purchase', existing.id, err)
      }

      await sendPurchaseEmail(normalizedEmail, locale, referralLink)
```

> This replaces the prior `locale` lookup + `await sendPurchaseEmail(normalizedEmail, locale)` (lines 99-105). Keep the surrounding `if (updated) {` / `}` intact. `config` is the handler-level `const config = useRuntimeConfig()` from line 5 — reuse it, don't redeclare.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/server/api/stripe/webhook.test.ts`
Expected: existing tests + 2 new pass. Note: `assignReferralCode` adds 2 DB reads to the first-writer path, so the original happy-path test's queue is now short — fix it in Step 5.

- [ ] **Step 5: Update the pre-existing happy-path test queue**

Update the original "returns { received: true } for valid checkout.session.completed" test `queueResults` (lines 40-44) to account for the email_signups locale lookup + referral-code assignment:

```ts
    queueResults(
      { data: null },                                                 // upsert
      { data: { id: 42, token_version: 1, activation_token: null } }, // post-upsert select
      { data: { id: 42 } },                                           // conditional update wins
      { data: { locale: 'en' } },                                     // email_signups locale lookup
      { data: { referral_code: 'CODE0001' } },                        // assignReferralCode claim
      { data: null },                                                 // vouchers insert
    )
```

> The two new tests in Step 1 omit the `email_signups` locale read for brevity — the mock returns `{ data: null }` (FIFO queue empty → fallback `state`), so `locale` falls back to `session.locale || 'en'`. Add `sendPurchaseEmail` is mocked, so the extra arg is harmless. If a new test asserts on locale, queue an explicit `{ data: { locale: 'en' } }` after the token-update entry.

Re-run: `npx vitest run tests/server/api/stripe/webhook.test.ts` → Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/api/stripe/webhook.post.ts tests/server/api/stripe/webhook.test.ts
git commit -m "feat(referral): webhook stores PaymentIntent, mints code, pays referrer"
```

---

## Task 8: `POST /api/referral/me`

**Files:**
- Create: `server/api/referral/me.post.ts`
- Test: `tests/server/api/referral-me.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/server/api/referral-me.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from './_helpers'

// requirePro is globally mocked in _setup as a pass-through returning null;
// override per-test to return claims with a pid.
const requirePro = (globalThis as any).requirePro as ReturnType<typeof vi.fn>

const { default: handler } = await import('../../../server/api/referral/me.post')

describe('POST /api/referral/me', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns code, link and tally for a Pro member with an existing code', async () => {
    requirePro.mockResolvedValueOnce({ sub: 'hash', pid: 7 })
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 7, referral_code: 'ABCD2345', email: 'm@x.com' } }, // purchase by pid
      { data: [                                                          // redemptions
        { reward_status: 'paid', reward_cents: 400 },
        { reward_status: 'failed', reward_cents: 0 },
      ] },
    )
    const event = createTestEvent({ supabase: client, body: {} })
    const result = await handler(event)
    expect(result.code).toBe('ABCD2345')
    expect(result.link).toContain('/pro?ref=ABCD2345')
    expect(result.joined_count).toBe(2)
    expect(result.earned_eur).toBe(4)
    expect(result.pending_count).toBe(1)
  })

  it('throws 401 when there are no Pro claims (sub missing)', async () => {
    requirePro.mockResolvedValueOnce(null)
    const { client } = createMockSupabase()
    const event = createTestEvent({ supabase: client, body: {} })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/api/referral-me.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `server/api/referral/me.post.ts`:

```ts
import { serverSupabaseServiceRole } from '#supabase/server'
import { assignReferralCode } from '../../utils/vouchers'

// Pro-gated. Returns the member's own referral code + a shareable link and
// a tally of conversions. Identity comes from the verified JWT (requirePro).
export default defineEventHandler(async (event) => {
  const claims = await requirePro(event)
  if (!claims?.sub) {
    throw createError({ statusCode: 401, statusMessage: 'Pro access required' })
  }

  const config = useRuntimeConfig()
  const supabase = await serverSupabaseServiceRole(event)

  // Resolve the purchase: prefer the pid claim, fall back to email_hash.
  const sel = 'id, referral_code, email'
  let purchase: { id: number; referral_code: string | null } | null = null
  if (typeof claims.pid === 'number') {
    const { data } = await supabase.from('pro_purchases').select(sel).eq('id', claims.pid).maybeSingle()
    purchase = data
  } else {
    const { data } = await supabase.from('pro_purchases').select(sel)
      .eq('email_hash', claims.sub).eq('is_active', true).maybeSingle()
    purchase = data
  }
  if (!purchase) throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })

  // Lazy backfill for purchases that predate the referral feature.
  let code = purchase.referral_code
  if (!code) code = await assignReferralCode(supabase, purchase.id, config.stripeReferralCouponId)

  const { data: redemptions } = await supabase
    .from('voucher_redemptions').select('reward_status, reward_cents').eq('voucher_code', code)
  const rows = Array.isArray(redemptions) ? redemptions : []
  const joinedCount = rows.length
  const earnedCents = rows.filter(r => r.reward_status === 'paid').reduce((s, r) => s + (r.reward_cents || 0), 0)
  const pendingCount = rows.filter(r => r.reward_status === 'failed').length

  return {
    code,
    link: `${config.public.siteUrl}/pro?ref=${code}`,
    joined_count: joinedCount,
    earned_eur: earnedCents / 100,
    pending_count: pendingCount,
  }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/server/api/referral-me.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/referral/me.post.ts tests/server/api/referral-me.test.ts
git commit -m "feat(referral): /api/referral/me — code, link, tally"
```

---

## Task 9: Emails — purchase-email referral link + reward email

**Files:**
- Modify: `server/utils/email.ts`
- Test: `tests/server/utils/email-referral.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/server/utils/email-referral.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn().mockResolvedValue({ id: 'email_1' })
vi.mock('resend', () => ({ Resend: vi.fn().mockImplementation(() => ({ emails: { send: (...a: any[]) => mockSend(...a) } })) }))

const { sendReferralRewardEmail, sendPurchaseEmail } = await import('../../../server/utils/email')

describe('sendReferralRewardEmail', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sends an EN reward email mentioning the amount', async () => {
    await sendReferralRewardEmail('member@x.com', 'en', { amountEur: 4 })
    expect(mockSend).toHaveBeenCalledTimes(1)
    const arg = mockSend.mock.calls[0][0]
    expect(arg.to).toBe('member@x.com')
    expect(arg.subject).toMatch(/friend/i)
    expect(arg.html).toContain('€4')
  })

  it('does not throw when Resend send rejects', async () => {
    mockSend.mockRejectedValueOnce(new Error('smtp down'))
    await expect(sendReferralRewardEmail('member@x.com', 'en', { amountEur: 4 })).resolves.toBeUndefined()
  })
})

describe('sendPurchaseEmail with referral link', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('includes the referral link when provided', async () => {
    await sendPurchaseEmail('buyer@x.com', 'en', 'https://eclipsechase.is/pro?ref=ABCD2345')
    const arg = mockSend.mock.calls[0][0]
    expect(arg.html).toContain('https://eclipsechase.is/pro?ref=ABCD2345')
  })

  it('omits the referral block when no link is given', async () => {
    await sendPurchaseEmail('buyer@x.com', 'en')
    const arg = mockSend.mock.calls[0][0]
    expect(arg.html).not.toContain('?ref=')
  })
})
```

> `getResend()` returns a client because `_setup.ts` sets `NUXT_RESEND_API_KEY`. This test imports `email.ts` directly (no `_setup` globals needed) and sets its own Resend mock; `useRuntimeConfig` is provided by the Nuxt test env. If `config.resendApiKey` is empty in this isolated import, add `process.env.NUXT_RESEND_API_KEY = 'test'` at the top of the file before the import.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/utils/email-referral.test.ts`
Expected: FAIL — `sendReferralRewardEmail` not exported.

- [ ] **Step 3: Write the implementation**

In `server/utils/email.ts`, add a strings table after `RESTORE_STRINGS` (after line 134):

```ts
const REFERRAL_REWARD_STRINGS: Record<EmailLocale, { subject: string; heading: string; body: (amt: string) => string; footer: string }> = {
  en: {
    subject: 'A friend joined — your reward is on the way',
    heading: 'A friend joined EclipseChase Pro',
    body: (amt) => `Thanks for spreading the word. We've issued a <strong style="color:#f1f5f9;">${amt}</strong> refund to the card you paid with — it should appear within a few business days.`,
    footer: 'Keep sharing your link — each friend who joins earns you another €4, up to the price you paid.',
  },
  is: {
    subject: 'Vinur skráði sig — verðlaunin þín eru á leiðinni',
    heading: 'Vinur gekk í EclipseChase Pro',
    body: (amt) => `Takk fyrir að dreifa boðskapnum. Við höfum endurgreitt <strong style="color:#f1f5f9;">${amt}</strong> á kortið sem þú greiddir með — það ætti að birtast innan fárra virkra daga.`,
    footer: 'Haltu áfram að deila hlekknum þínum — hver vinur sem skráir sig gefur þér €4 til viðbótar, allt að því verði sem þú greiddir.',
  },
}
```

Add the send function after `sendRestoreCode` (after line 221):

```ts
export async function sendReferralRewardEmail(
  to: string,
  locale: string | null | undefined,
  opts: { amountEur: number },
): Promise<void> {
  const resend = getResend()
  if (!resend) {
    console.log('[email] Resend not configured, skipping referral reward to', maskEmail(to))
    return
  }
  const lang = resolveLocale(locale)
  const s = REFERRAL_REWARD_STRINGS[lang]
  const amt = `€${opts.amountEur}`
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: s.subject,
      html: `
<!DOCTYPE html><html lang="${htmlLangAttr(lang)}"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050810;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    ${brandHeaderHtml()}
    <div style="background:#0a1020;border:1px solid #1a2540;border-radius:6px;padding:32px 24px;">
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#f1f5f9;">${s.heading}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94a3b8;">${s.body(amt)}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">${s.footer}</p>
    </div>
  </div>
</body></html>`,
    })
    console.log(`[email] Referral reward (${lang}) sent to`, maskEmail(to))
  } catch (err: any) {
    console.error('[email] Failed to send referral reward to', maskEmail(to), ':', err.message || err)
  }
}
```

- [ ] **Step 3b: Thread an optional referral link into the purchase email**

Add an `inviteLabel` / `inviteBody` pair to each arm of `PURCHASE_STRINGS` (after `saveFooter`, around lines 98 and 111):

```ts
    // en arm:
    inviteLabel: 'INVITE A FRIEND',
    inviteBody: 'Give a friend 20% off and get €4 back when they join. Your link:',
```
```ts
    // is arm:
    inviteLabel: 'BJÓÐA VINI',
    inviteBody: 'Gefðu vini 20% afslátt og fáðu €4 til baka þegar hann skráir sig. Hlekkurinn þinn:',
```
(Add the two keys to the `PURCHASE_STRINGS` type literal as well: `inviteLabel: string; inviteBody: string`.)

Change the `sendPurchaseEmail` signature + call to thread the link (replace the existing function head and its `html:` argument):

```ts
export async function sendPurchaseEmail(to: string, locale?: string | null, referralLink?: string) {
  const resend = getResend()
  if (!resend) {
    console.log('[email] Resend not configured, skipping purchase email to', maskEmail(to))
    return
  }

  const lang = resolveLocale(locale)
  const s = PURCHASE_STRINGS[lang]

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: s.subject,
      html: purchaseHtml(lang, referralLink),
    })
    console.log(`[email] Purchase email (${lang}) sent to`, maskEmail(to))
  } catch (err: any) {
    console.error('[email] Failed to send purchase email to', maskEmail(to), ':', err.message || err)
  }
}
```

Update `purchaseHtml` to accept the link and render an invite block when present. Change its signature to `function purchaseHtml(locale: EmailLocale, referralLink?: string): string {` and insert this block right after the "Save this email" `<div>` (before the "Eclipse stats" block):

```ts
    ${referralLink ? `
    <!-- Invite a friend -->
    <div style="margin-top:24px;background:#0a1020;border:1px solid #1a2540;border-radius:6px;padding:24px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#f59e0b;margin-bottom:12px;">${s.inviteLabel}</div>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#94a3b8;">${s.inviteBody}</p>
      <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${referralLink}" style="color:#f59e0b;text-decoration:none;">${referralLink}</a></p>
    </div>` : ''}
```

(Inside `purchaseHtml`, `const s = PURCHASE_STRINGS[locale]` is already defined — reuse it.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/server/utils/email-referral.test.ts`
Expected: PASS (4 cases: reward EN, reward no-throw, purchase-with-link, purchase-without-link).

- [ ] **Step 5: Commit**

```bash
git add server/utils/email.ts tests/server/utils/email-referral.test.ts
git commit -m "feat(referral): purchase-email link + referrer-reward email"
```

---

## Task 10: i18n keys

**Files:**
- Modify: `i18n/en.json`, `i18n/is.json`

- [ ] **Step 1: Add the EN keys**

In `i18n/en.json`, add a top-level `"referral"` object (and `pro` discount keys). Insert:

```json
  "referral": {
    "card_title": "INVITE A FRIEND",
    "explainer": "Share your link. Your friend gets 20% off, and you get €4 back when they join.",
    "your_link": "Your link",
    "copy": "Copy link",
    "copied": "Copied!",
    "share": "Share",
    "tally_joined": "{count} friend joined",
    "tally_joined_plural": "{count} friends joined",
    "tally_earned": "€{amount} earned",
    "reward_pending": "A reward is pending — we'll sort it out.",
    "loading": "Loading your link…"
  },
  "pro_discount": {
    "have_code": "Have a code?",
    "code_placeholder": "Enter code",
    "apply": "Apply",
    "friend_gift": "Your friend gave you 20% off.",
    "code_applied": "Code applied — {percent}% off.",
    "code_invalid": "That code isn't valid or has expired.",
    "original_price": "€9.99",
    "was": "was"
  }
```

- [ ] **Step 2: Add the IS keys**

In `i18n/is.json`, add the same structure with Icelandic copy:

```json
  "referral": {
    "card_title": "BJÓÐA VINI",
    "explainer": "Deildu hlekknum þínum. Vinur þinn fær 20% afslátt og þú færð €4 til baka þegar hann skráir sig.",
    "your_link": "Hlekkurinn þinn",
    "copy": "Afrita hlekk",
    "copied": "Afritað!",
    "share": "Deila",
    "tally_joined": "{count} vinur skráði sig",
    "tally_joined_plural": "{count} vinir skráðu sig",
    "tally_earned": "€{amount} áunnið",
    "reward_pending": "Verðlaun eru í bið — við reddum því.",
    "loading": "Hleð hlekkinn þinn…"
  },
  "pro_discount": {
    "have_code": "Ertu með kóða?",
    "code_placeholder": "Sláðu inn kóða",
    "apply": "Virkja",
    "friend_gift": "Vinur þinn gaf þér 20% afslátt.",
    "code_applied": "Kóði virkjaður — {percent}% afsláttur.",
    "code_invalid": "Þessi kóði er ógildur eða útrunninn.",
    "original_price": "€9.99",
    "was": "var"
  }
```

- [ ] **Step 3: Verify JSON parses**

Run: `node -e "require('./i18n/en.json'); require('./i18n/is.json'); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add i18n/en.json i18n/is.json
git commit -m "feat(referral): i18n keys (en + is)"
```

---

## Task 11: `ReferralCard.vue` + render on `/me`

**Files:**
- Create: `app/components/ReferralCard.vue`
- Modify: `app/pages/me.vue`
- Test: `tests/components/ReferralCard.test.ts`

- [ ] **Step 1: Write the component**

Create `app/components/ReferralCard.vue`:

```vue
<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import CardTitle from '~/components/ui/CardTitle.vue'

const { t } = useI18n()
const { authHeaders } = useProStatus()

interface ReferralInfo {
  code: string
  link: string
  joined_count: number
  earned_eur: number
  pending_count: number
}

const info = ref<ReferralInfo | null>(null)
const loading = ref(true)
const copied = ref(false)

onMounted(async () => {
  try {
    info.value = await $fetch<ReferralInfo>('/api/referral/me', {
      method: 'POST',
      headers: await authHeaders(),
    })
  } catch {
    info.value = null
  } finally {
    loading.value = false
  }
})

async function copyLink() {
  if (!info.value) return
  try {
    if (navigator.share) {
      await navigator.share({ url: info.value.link, title: 'EclipseChase Pro' })
      return
    }
    await navigator.clipboard.writeText(info.value.link)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* user cancelled share / clipboard blocked */ }
}

const joinedLabel = computed(() => {
  if (!info.value) return ''
  const n = info.value.joined_count
  return t(n === 1 ? 'referral.tally_joined' : 'referral.tally_joined_plural', { count: n })
})
</script>

<template>
  <Card v-if="loading || info">
    <CardTitle>{{ t('referral.card_title') }}</CardTitle>
    <p v-if="loading" class="rc-loading">{{ t('referral.loading') }}</p>
    <template v-else-if="info">
      <p class="rc-explainer">{{ t('referral.explainer') }}</p>
      <div class="rc-link-row">
        <code class="rc-link">{{ info.link }}</code>
        <button class="rc-copy" type="button" @click="copyLink">
          {{ copied ? t('referral.copied') : t('referral.copy') }}
        </button>
      </div>
      <div v-if="info.joined_count > 0" class="rc-tally">
        <span>{{ joinedLabel }}</span>
        <span class="rc-earned">{{ t('referral.tally_earned', { amount: info.earned_eur }) }}</span>
      </div>
      <p v-if="info.pending_count > 0" class="rc-pending">{{ t('referral.reward_pending') }}</p>
    </template>
  </Card>
</template>

<style scoped>
.rc-explainer { font-family: 'Inter Tight', system-ui, sans-serif; font-size: 13px; line-height: 1.5; color: rgb(var(--ink-1) / 0.72); margin: 8px 0 14px; }
.rc-loading { font-family: 'Inter Tight', system-ui, sans-serif; font-size: 13px; color: rgb(var(--ink-1) / 0.5); }
.rc-link-row { display: flex; gap: 8px; align-items: center; }
.rc-link { flex: 1; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; color: rgb(var(--ink-1) / 0.8); background: rgb(var(--bg)); border: 1px solid rgb(var(--border-subtle) / 0.4); border-radius: 6px; padding: 8px 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-copy { flex-shrink: 0; background: rgb(var(--accent)); color: rgb(var(--accent-ink)); border: 0; border-radius: 6px; padding: 8px 12px; font-family: 'Inter Tight', system-ui, sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; }
.rc-copy:hover { background: rgb(var(--accent-strong)); }
.rc-tally { display: flex; justify-content: space-between; margin-top: 14px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.08em; color: rgb(var(--ink-1) / 0.62); }
.rc-earned { color: rgb(var(--good)); }
.rc-pending { margin-top: 10px; font-family: 'Inter Tight', system-ui, sans-serif; font-size: 12px; color: rgb(var(--warn)); }
</style>
```

- [ ] **Step 2: Render it on `/me`**

In `app/pages/me.vue`, inside `.me-body` (after the status `<Card>` block, before the `<ClientOnly>` restore block — around line 29), add:

```vue
      <ClientOnly>
        <ReferralCard v-if="isPro" />
      </ClientOnly>
```

- [ ] **Step 3: Write a smoke test**

Create `tests/components/ReferralCard.test.ts` (mirror the mount style of an existing test such as `tests/components/EmailSignup.test.ts` — open it first to copy the exact `mountSuspended`/stub imports used in this repo):

```ts
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ReferralCard from '../../app/components/ReferralCard.vue'

// $fetch is auto-stubbed by @nuxt/test-utils; override to return our payload.
vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
  code: 'ABCD2345', link: 'https://eclipsechase.is/pro?ref=ABCD2345',
  joined_count: 1, earned_eur: 4, pending_count: 0,
}))

describe('ReferralCard', () => {
  it('renders the referral link after load', async () => {
    const wrapper = await mountSuspended(ReferralCard)
    // allow onMounted fetch microtask to resolve
    await new Promise(r => setTimeout(r, 0))
    expect(wrapper.html()).toContain('ABCD2345')
  })
})
```

> If `mountSuspended` / `$fetch` stubbing differs in this repo, align with the existing component test you opened. If the component proves impractical to mount in isolation (e.g. `useProStatus` auto-import), keep the test minimal — assert the component module imports without throwing — and rely on manual verification in Step 5.

- [ ] **Step 4: Run the smoke test + typecheck**

Run: `npx vitest run tests/components/ReferralCard.test.ts`
Expected: PASS.
Run: `npx nuxi typecheck` (or `npm run build`) — Expected: no type errors in the new files.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open `/me` (dev bypass makes you Pro). Expected: the "INVITE A FRIEND" card renders with a link and a working Copy button. With seeded redemptions, the tally shows "1 friend joined · €4 earned".

- [ ] **Step 6: Commit**

```bash
git add app/components/ReferralCard.vue app/pages/me.vue tests/components/ReferralCard.test.ts
git commit -m "feat(referral): ReferralCard on /me"
```

---

## Task 12: `/pro` discount UX (referral link + manual code)

**Files:**
- Modify: `app/pages/pro/index.vue`

- [ ] **Step 1: Add discount state + validation logic**

In `app/pages/pro/index.vue` `<script setup>`, after the existing `const email = ref('')` / `alreadyPro` declarations (around line 26), add:

```ts
const voucherCode = ref('')
const voucherValid = ref(false)
const voucherPercent = ref(0)
const voucherKind = ref<'referral' | 'manual' | ''>('')
const voucherError = ref('')
const codeInput = ref('')

async function validateVoucher(raw: string) {
  voucherError.value = ''
  voucherValid.value = false
  const code = raw.trim().toUpperCase()
  if (!code) return
  try {
    const res = await $fetch<{ valid: boolean; discount_percent?: number; kind?: 'referral' | 'manual' }>(
      '/api/vouchers/validate', { method: 'POST', body: { code } },
    )
    if (res.valid) {
      voucherValid.value = true
      voucherCode.value = code
      voucherPercent.value = res.discount_percent ?? 0
      voucherKind.value = res.kind ?? ''
    } else {
      voucherError.value = t('pro_discount.code_invalid')
    }
  } catch {
    voucherError.value = t('pro_discount.code_invalid')
  }
}

function applyTypedCode() {
  validateVoucher(codeInput.value)
}

const discountedPrice = computed(() =>
  voucherValid.value ? (9.99 * (100 - voucherPercent.value) / 100).toFixed(2) : null,
)

onMounted(() => {
  const ref = route.query.ref
  if (typeof ref === 'string' && ref) {
    codeInput.value = ref
    validateVoucher(ref)
  }
})
```

- [ ] **Step 2: Pass the validated code into checkout**

In `handleCheckout` (the `$fetch('/api/stripe/checkout', ...)` call, around line 71), change the body to include the code:

```ts
    const { url } = await $fetch<{ url: string }>('/api/stripe/checkout', {
      method: 'POST',
      body: { email: trimmed, voucher_code: voucherValid.value ? voucherCode.value : undefined },
    })
```

- [ ] **Step 3: Add the discount banner + code field to the template**

In the price card, just below the `<div class="price-amount">&euro;9.99</div>` line (around line 136), replace that line with a price block that reflects the discount, and add the code UI. Replace:

```vue
        <div class="price-amount">&euro;9.99</div>
```

with:

```vue
        <div class="price-amount">
          <template v-if="discountedPrice">
            <span class="price-was">&euro;9.99</span>
            <span>&euro;{{ discountedPrice }}</span>
          </template>
          <template v-else>&euro;9.99</template>
        </div>

        <!-- Discount banner -->
        <p v-if="voucherValid && voucherKind === 'referral'" class="price-discount-note">
          {{ t('pro_discount.friend_gift') }}
        </p>
        <p v-else-if="voucherValid" class="price-discount-note">
          {{ t('pro_discount.code_applied', { percent: voucherPercent }) }}
        </p>

        <!-- Manual code entry -->
        <div v-if="!voucherValid" class="price-code">
          <label class="price-email-label" for="voucher-code">{{ t('pro_discount.have_code') }}</label>
          <div class="price-code-row">
            <input
              id="voucher-code"
              v-model="codeInput"
              type="text"
              :placeholder="t('pro_discount.code_placeholder')"
              class="price-email-input"
              @keyup.enter="applyTypedCode"
            >
            <button type="button" class="price-code-apply" @click="applyTypedCode">
              {{ t('pro_discount.apply') }}
            </button>
          </div>
          <p v-if="voucherError" class="price-error">{{ voucherError }}</p>
        </div>
```

- [ ] **Step 4: Add styles**

In the `<style scoped>` block of `pro/index.vue`, add:

```css
.price-was { text-decoration: line-through; opacity: 0.4; font-size: 0.5em; margin-right: 12px; vertical-align: middle; }
.price-discount-note { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.08em; color: rgb(var(--good)); margin: -12px 0 20px; }
.price-code { max-width: 320px; margin: 0 auto 14px; text-align: left; }
.price-code-row { display: flex; gap: 8px; }
.price-code-apply { flex-shrink: 0; background: rgb(var(--surface) / 0.1); color: rgb(var(--ink-1)); border: 1px solid rgb(var(--border-subtle) / 0.4); border-radius: 8px; padding: 0 14px; font-family: 'Inter Tight', system-ui, sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
.price-code-apply:hover { border-color: rgb(var(--accent) / 0.5); }
```

- [ ] **Step 5: Typecheck + manual verification**

Run: `npx nuxi typecheck` — Expected: no errors.
Run `npm run dev`, open `/pro?ref=SOMECODE` (seed a usable voucher in `vouchers` first, or temporarily set one active). Expected: price shows `€9.99` struck through → discounted price, and "Your friend gave you 20% off." Typing a bad code shows the invalid message.

- [ ] **Step 6: Commit**

```bash
git add app/pages/pro/index.vue
git commit -m "feat(referral): /pro discount banner + voucher code entry"
```

---

## Task 13: `mint-voucher.mjs` admin script

**Files:**
- Create: `scripts/mint-voucher.mjs`

- [ ] **Step 1: Write the script**

Create `scripts/mint-voucher.mjs`:

```js
#!/usr/bin/env node
// Mint a manual (press/influencer/beta) voucher.
//   node scripts/mint-voucher.mjs --code ICELAND26 --discount 30 --max 200 --expires 2026-08-13
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, STRIPE_SECRET_KEY
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const code = (arg('code') || '').trim().toUpperCase()
const discount = parseInt(arg('discount', '0'), 10)
const max = arg('max') ? parseInt(arg('max'), 10) : null
const expires = arg('expires') ? new Date(arg('expires')).toISOString() : null

if (!code || !discount) {
  console.error('Usage: --code CODE --discount PERCENT [--max N] [--expires YYYY-MM-DD]')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Create-or-reuse a percent-off coupon for this discount value.
const coupon = await stripe.coupons.create({ percent_off: discount, duration: 'once', name: `${discount}% off` })

const { error } = await supabase.from('vouchers').insert({
  code, stripe_coupon_id: coupon.id, discount_percent: discount,
  kind: 'manual', referrer_id: null, max_redemptions: max, expires_at: expires,
})
if (error) { console.error('Insert failed:', error.message); process.exit(1) }

console.log(`Minted ${code}: ${discount}% off (coupon ${coupon.id})${max ? `, max ${max}` : ''}${expires ? `, expires ${expires}` : ''}`)
```

- [ ] **Step 2: Verify it parses**

Run: `node --check scripts/mint-voucher.mjs`
Expected: no output (valid syntax). (Do not run it without real env vars — it would hit Stripe/Supabase.)

- [ ] **Step 3: Commit**

```bash
git add scripts/mint-voucher.mjs
git commit -m "feat(referral): mint-voucher CLI for manual codes"
```

---

## Task 14: Full verification + finish

- [ ] **Step 1: Run the whole suite**

Run: `npm run test`
Expected: all tests pass (the pre-existing 510 + the new referral/voucher tests).

- [ ] **Step 2: Typecheck + build**

Run: `npx nuxi typecheck` then `npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 3: Placeholder lint (repo convention)**

Run: `npm run lint:placeholders`
Expected: passes (no stray TODO/placeholder markers in shipped code).

- [ ] **Step 4: Manual smoke of the full flow (optional, recommended)**

With real Stripe test keys + a `NUXT_STRIPE_REFERRAL_COUPON_ID` 20%-off coupon:
1. Buy Pro → confirm a `referral_code` + `vouchers` row are created and the purchase email shows the link.
2. Open `/pro?ref=<thatcode>` in a fresh browser, buy with a different email → confirm `voucher_redemptions` row, a €4 refund on the referrer's PaymentIntent in the Stripe dashboard, and a referrer-reward email.
3. Try `/pro?ref=<same person's own code>` with the same email → confirm discount applies but NO refund (self-referral guard).

- [ ] **Step 5: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill to choose merge / PR / cleanup. Suggested PR title: "Referral program + price vouchers (Pro)".

---

## Notes for the executor

- **Auto-imports:** `server/utils/*` and `app/composables/*` are auto-imported in Nitro/Nuxt — call `sendReferralRewardEmail`, `assignReferralCode`, `useProStatus`, etc. unqualified in runtime code (the explicit `import` statements shown for server utils are used where the existing file already imports siblings that way; follow the surrounding file's convention). Tests import modules by relative path.
- **Mock Supabase ordering:** `queueResults(...)` feeds results FIFO per terminal `await`/`.maybeSingle()`. When you add or remove a DB call, re-count the queue in affected tests.
- **Money safety invariants** (do not regress): refund amount is exactly `REFERRAL_REWARD_CENTS`; the refund idempotency key is `referral-refund-<friendSessionId>`; `referee_session_id` is UNIQUE; self-referral compares `email_hash` values.
```
