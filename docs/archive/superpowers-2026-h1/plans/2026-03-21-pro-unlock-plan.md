# Purchase-Based Pro Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase Auth magic-link Pro system with JWT-based purchase-is-the-key approach — no accounts, no passwords, offline-capable via RS256 tokens stored in IndexedDB.

**Architecture:** Stripe Checkout creates payment → webhook generates RS256 JWT → client stores in IndexedDB → client verifies locally with embedded public key. Restore flow uses email + 6-digit code via Resend. No Supabase Auth involved.

**Tech Stack:** jose (JWT), stripe (payments), Resend (email), Supabase (database only), IndexedDB (client token storage)

**Spec:** `D:\Projects\eclipsechase\eclipsechase-pro-unlock-spec.md`

---

## File Structure

### New files
- `server/utils/jwt.ts` — RS256 token generation (server-side)
- `app/utils/proStorage.ts` — IndexedDB read/write/delete for activation token
- `server/api/stripe/activate.post.ts` — Return JWT after purchase (client calls with session_id)
- `server/api/stripe/restore/request.post.ts` — Send 6-digit restore code to email
- `server/api/stripe/restore/verify.post.ts` — Verify code, return new JWT
- `app/components/ProUpgradeButton.vue` — Reusable checkout trigger button
- `app/components/ProGate.vue` — Slot wrapper that gates content behind Pro
- `app/components/RestorePurchase.vue` — Restore purchase state machine UI
- `app/pages/pro/success.vue` — Post-checkout activation page
- `scripts/migrations/003-pro-purchases.sql` — DB migration: drop pro_users, create pro_purchases + restore_codes

### Modified files
- `package.json` — Add `jose` dependency
- `nuxt.config.ts` — Remove Supabase auth config, add `proJwtPrivateKey` to runtimeConfig
- `.env.example` — Add `PRO_JWT_PRIVATE_KEY`
- `app/composables/useProStatus.ts` — Complete rewrite: JWT-based, offline, no Supabase Auth
- `app/middleware/pro-gate.ts` — Simplify: check JWT token only
- `app/pages/pro.vue` — Remove magic link, add restore purchase, simplify checkout
- `server/api/stripe/checkout.post.ts` — Remove email param (Stripe collects it), change success_url
- `server/api/stripe/webhook.post.ts` — Remove Supabase Auth, generate JWT, insert into pro_purchases
- `server/utils/email.ts` — Add `sendRestoreCode()` function
- `i18n/en.json` — Update pro/auth/confirm strings
- `scripts/schema.sql` — Update to show new pro_purchases table

### Files to delete
- `app/pages/confirm.vue` — Supabase Auth callback, no longer needed
- `server/api/auth/link-pro.post.ts` — Supabase Auth linking, no longer needed
- `server/api/pro/status.get.ts` — Server-side auth check, no longer needed
- `server/api/stripe/verify-session.get.ts` — Replaced by activate endpoint
- `server/utils/pro.ts` — Supabase Auth helper, no longer needed

---

## Task 1: Install jose and generate RSA key pair

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install jose**

```bash
cd D:/Projects/eclipsechase/eclipse-chaser/.claude/worktrees/brave-hugle && npm install jose
```

- [ ] **Step 2: Generate RSA key pair for development**

```bash
cd D:/Projects/eclipsechase/eclipse-chaser/.claude/worktrees/brave-hugle
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

The private key content goes into `PRO_JWT_PRIVATE_KEY` env var. The public key gets embedded in client code.

- [ ] **Step 3: Update .env.example**

Add `PRO_JWT_PRIVATE_KEY` entry.

- [ ] **Step 4: Add runtimeConfig entry in nuxt.config.ts**

Add `proJwtPrivateKey: ''` to `runtimeConfig` (server-only).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example nuxt.config.ts
git commit -m "feat: add jose for JWT-based Pro token signing"
```

---

## Task 2: Create server JWT utility and IndexedDB storage

**Files:**
- Create: `server/utils/jwt.ts`
- Create: `app/utils/proStorage.ts`

- [ ] **Step 1: Create `server/utils/jwt.ts`**

Server-only utility that:
- Imports private key from `PRO_JWT_PRIVATE_KEY` env var
- `generateProToken(email, sessionId)` → returns signed RS256 JWT
- Payload: `{ sub: SHA-256(email), sid: sessionId, v: 1 }`
- Expiry: August 31, 2026 (Unix timestamp 1788220800)

```typescript
import { SignJWT, importPKCS8 } from 'jose'
import { createHash } from 'crypto'

const TOKEN_EXPIRY = Math.floor(new Date('2026-08-31T23:59:59Z').getTime() / 1000)

export async function generateProToken(email: string, sessionId: string): Promise<string> {
  const config = useRuntimeConfig()
  const privateKeyPem = config.proJwtPrivateKey.replace(/\\n/g, '\n')
  const privateKey = await importPKCS8(privateKeyPem, 'RS256')
  const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex')

  return new SignJWT({ sub: emailHash, sid: sessionId, v: 1 })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(privateKey)
}
```

- [ ] **Step 2: Create `app/utils/proStorage.ts`**

Client-side IndexedDB wrapper with `saveToken`, `getToken`, `removeToken` functions. Follows spec section 4.2 exactly.

```typescript
const DB_NAME = 'eclipsechase'
const STORE_NAME = 'pro'
const TOKEN_KEY = 'activation_token'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveTokenToIndexedDB(token: string): Promise<void> { ... }
export async function getTokenFromIndexedDB(): Promise<string | null> { ... }
export async function removeTokenFromIndexedDB(): Promise<void> { ... }
```

- [ ] **Step 3: Commit**

```bash
git add server/utils/jwt.ts app/utils/proStorage.ts
git commit -m "feat: add JWT token generation and IndexedDB storage utilities"
```

---

## Task 3: Database migration — pro_purchases and restore_codes

**Files:**
- Create: `scripts/migrations/003-pro-purchases.sql`
- Modify: `scripts/schema.sql`

- [ ] **Step 1: Create migration SQL**

```sql
-- Drop old table
DROP TABLE IF EXISTS pro_users;

-- Purchase records
CREATE TABLE pro_purchases (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  activation_token TEXT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  restored_count INTEGER DEFAULT 0,
  last_restored_at TIMESTAMPTZ
);

CREATE INDEX idx_pro_purchases_email ON pro_purchases(email);
CREATE INDEX idx_pro_purchases_email_hash ON pro_purchases(email_hash);
CREATE INDEX idx_pro_purchases_stripe_session ON pro_purchases(stripe_session_id);

-- Restore codes (short-lived)
CREATE TABLE restore_codes (
  id BIGSERIAL PRIMARY KEY,
  email_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_restore_codes_lookup ON restore_codes(email_hash, code);

-- RLS
ALTER TABLE pro_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE restore_codes ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Update `scripts/schema.sql`**

Replace `pro_users` table definition with `pro_purchases` and `restore_codes`. Remove old RLS policy for pro_users.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrations/003-pro-purchases.sql scripts/schema.sql
git commit -m "feat: add pro_purchases and restore_codes tables, drop pro_users"
```

---

## Task 4: Rewrite Stripe webhook — JWT generation, no Supabase Auth

**Files:**
- Modify: `server/api/stripe/webhook.post.ts`

- [ ] **Step 1: Rewrite webhook handler**

Remove all Supabase Auth logic (createUser, listUsers, auth_user_id linking). Instead:
1. Verify webhook signature (keep existing logic)
2. Extract customer email from `session.customer_details.email`
3. Generate JWT via `generateProToken()`
4. Compute email_hash
5. Insert into `pro_purchases` table (upsert on `stripe_session_id`)
6. Return 200

Key changes:
- Use `serverSupabaseServiceRole` for DB only (no auth calls)
- Remove `#supabase/server` auth imports
- Use `session.customer_details.email` (not `session.customer_email` which is the prefilled value)
- Handle duplicate session_id gracefully (idempotent)

- [ ] **Step 2: Verify it compiles**

```bash
cd D:/Projects/eclipsechase/eclipse-chaser/.claude/worktrees/brave-hugle && npx nuxi typecheck
```

- [ ] **Step 3: Commit**

```bash
git add server/api/stripe/webhook.post.ts
git commit -m "feat: webhook generates JWT token, stores in pro_purchases"
```

---

## Task 5: Create activate endpoint

**Files:**
- Create: `server/api/stripe/activate.post.ts`

- [ ] **Step 1: Create activate endpoint**

POST `/api/stripe/activate` with body `{ session_id: string }`.

1. Look up `pro_purchases` by `stripe_session_id`
2. If not found → 404
3. If found → return `{ token, email }` (email masked: `t***t@example.com`)

```typescript
export default defineEventHandler(async (event) => {
  const { session_id } = await readBody<{ session_id: string }>(event)
  if (!session_id) {
    throw createError({ statusCode: 400, statusMessage: 'session_id is required' })
  }

  const supabase = await serverSupabaseServiceRole(event)
  const { data } = await supabase
    .from('pro_purchases')
    .select('activation_token, email')
    .eq('stripe_session_id', session_id)
    .maybeSingle()

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })
  }

  // Mask email: first char + *** + last char before @
  const [local, domain] = data.email.split('@')
  const masked = local[0] + '***' + local[local.length - 1] + '@' + domain

  return { token: data.activation_token, email: masked }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/stripe/activate.post.ts
git commit -m "feat: add activate endpoint to retrieve JWT after purchase"
```

---

## Task 6: Update Stripe checkout endpoint

**Files:**
- Modify: `server/api/stripe/checkout.post.ts`

- [ ] **Step 1: Simplify checkout**

Remove email parameter (let Stripe collect it). Change success_url to `/pro/success?session_id={CHECKOUT_SESSION_ID}`. Keep cancel_url as `/pro?cancelled=true`.

```typescript
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: 999,
        product_data: {
          name: 'EclipseChase Pro',
          description: 'Live weather map, personalized recommendations, offline maps & road conditions for the 2026 Iceland eclipse.',
        },
      },
      quantity: 1,
    }],
    metadata: { product: 'eclipse_pro_2026' },
    success_url: `${config.public.siteUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.public.siteUrl}/pro?cancelled=true`,
  })

  return { url: session.url }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/stripe/checkout.post.ts
git commit -m "feat: simplify checkout - let Stripe collect email, redirect to success page"
```

---

## Task 7: Create restore endpoints and update email utility

**Files:**
- Create: `server/api/stripe/restore/request.post.ts`
- Create: `server/api/stripe/restore/verify.post.ts`
- Modify: `server/utils/email.ts`

- [ ] **Step 1: Add `sendRestoreCode()` to `server/utils/email.ts`**

Add function that sends 6-digit code email via Resend. Uses the HTML template from spec section 9.

- [ ] **Step 2: Create restore request endpoint**

POST `/api/stripe/restore/request` with body `{ email: string }`.

1. Normalize email (lowercase, trim)
2. Compute email_hash
3. Look up `pro_purchases` by email
4. Always return `{ sent: true }` (prevent email enumeration)
5. If purchase exists: generate 6-digit code, store in `restore_codes` (15 min TTL), send email
6. If not: still return success (but don't send email)

- [ ] **Step 3: Create restore verify endpoint**

POST `/api/stripe/restore/verify` with body `{ email: string, code: string }`.

1. Normalize email, compute email_hash
2. Look up `restore_codes` by email_hash + code
3. Validate: exists, not expired, not used
4. Mark code as used
5. Look up `pro_purchases` by email
6. Generate fresh JWT
7. Update `pro_purchases` with new token, increment `restored_count`
8. Return `{ token }`

- [ ] **Step 4: Commit**

```bash
git add server/utils/email.ts server/api/stripe/restore/
git commit -m "feat: add restore purchase flow with email verification codes"
```

---

## Task 8: Rewrite useProStatus composable — JWT-based, offline

**Files:**
- Modify: `app/composables/useProStatus.ts`

- [ ] **Step 1: Complete rewrite**

Remove all Supabase Auth references. New implementation:
- Uses `jose`'s `jwtVerify` + `importSPKI` for client-side verification
- Reads token from IndexedDB via `proStorage.ts`
- Exports: `isPro`, `loading`, `checkStatus()`, `activate(token)`, `clearPro()`
- No server calls needed — fully offline
- Public key embedded as constant

```typescript
import { jwtVerify, importSPKI } from 'jose'
import { getTokenFromIndexedDB, saveTokenToIndexedDB, removeTokenFromIndexedDB } from '~/utils/proStorage'

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
... (from generated public.pem)
-----END PUBLIC KEY-----`

export function useProStatus() {
  const isPro = useState<boolean>('pro-status', () => false)
  const loading = useState<boolean>('pro-loading', () => true)

  async function checkStatus() {
    if (!import.meta.client) { loading.value = false; return }
    try {
      const token = await getTokenFromIndexedDB()
      if (!token) { isPro.value = false; loading.value = false; return }
      const publicKey = await importSPKI(PUBLIC_KEY_PEM, 'RS256')
      await jwtVerify(token, publicKey)
      isPro.value = true
    } catch {
      isPro.value = false
      await removeTokenFromIndexedDB()
    } finally {
      loading.value = false
    }
  }

  async function activate(token: string) {
    await saveTokenToIndexedDB(token)
    isPro.value = true
  }

  async function clearPro() {
    await removeTokenFromIndexedDB()
    isPro.value = false
  }

  onMounted(checkStatus)

  return { isPro, loading, checkStatus, activate, clearPro }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/composables/useProStatus.ts
git commit -m "feat: rewrite useProStatus with JWT verification and IndexedDB"
```

---

## Task 9: Simplify pro-gate middleware

**Files:**
- Modify: `app/middleware/pro-gate.ts`

- [ ] **Step 1: Rewrite middleware**

Remove all Supabase Auth logic, cookie checks, and verify-session calls. New flow:
1. Check `isPro` state (populated by useProStatus on mount)
2. If not Pro → redirect to `/pro`
3. Skip in dev mode (keep existing behavior)

```typescript
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.dev) return

  const { isPro, loading, checkStatus } = useProStatus()

  // If still loading (SSR or first load), check status
  if (loading.value) {
    await checkStatus()
  }

  if (!isPro.value) {
    return navigateTo('/pro')
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add app/middleware/pro-gate.ts
git commit -m "feat: simplify pro-gate middleware to JWT-only check"
```

---

## Task 10: Create client components — ProUpgradeButton, ProGate, RestorePurchase

**Files:**
- Create: `app/components/ProUpgradeButton.vue`
- Create: `app/components/ProGate.vue`
- Create: `app/components/RestorePurchase.vue`

- [ ] **Step 1: Create ProUpgradeButton.vue**

Props: `label` (default: "Upgrade to Eclipse Pro — €9.99"), `variant` ('primary' | 'inline').
On click: POST `/api/stripe/checkout`, redirect to Stripe. Shows loading spinner.
Design: follows project design tokens (amber button, dark theme).

- [ ] **Step 2: Create ProGate.vue**

Props: `feature` (string for analytics).
Uses `useProStatus()`. If Pro → renders slot. If loading → skeleton. If not Pro → upgrade prompt with ProUpgradeButton.

- [ ] **Step 3: Create RestorePurchase.vue**

State machine: IDLE → EMAIL_INPUT → CODE_SENT → CODE_INPUT → VERIFYING → SUCCESS → ERROR.
Email input, 6-digit code input (6 separate boxes, auto-submit on 6th digit).
Calls restore/request and restore/verify endpoints.
On success: calls `activate(token)` from useProStatus.

- [ ] **Step 4: Commit**

```bash
git add app/components/ProUpgradeButton.vue app/components/ProGate.vue app/components/RestorePurchase.vue
git commit -m "feat: add ProUpgradeButton, ProGate, and RestorePurchase components"
```

---

## Task 11: Create success page and update pro page

**Files:**
- Create: `app/pages/pro/success.vue`
- Modify: `app/pages/pro.vue`

- [ ] **Step 1: Create `/pro/success` page**

URL: `/pro/success?session_id={id}`

1. Extract session_id from query
2. Call POST `/api/stripe/activate` with session_id
3. On success: store token via `activate()`, show success message, "Go to Eclipse Map" button
4. On 404 (webhook pending): retry up to 3 times with 2s delay
5. On final failure: show "activation taking longer" message with restore instructions

Design: follows project patterns (noise background, nav, centered content).

- [ ] **Step 2: Update `/pro` page**

Remove:
- Magic link login section (entire "Already have Pro?" card)
- `sendMagicLink` import
- `loginEmail`, `loginSubmitting`, `loginError`, `loginSent` state
- `handleLogin()` function
- `isLoggedIn` check and redirect
- `noSubscription` banner
- Email input from checkout form (Stripe collects it now)

Add:
- `<RestorePurchase />` component below checkout card
- Simplify checkout: remove email input, just button + waiver

Keep:
- Feature list, price card, withdrawal waiver, cancelled banner

- [ ] **Step 3: Commit**

```bash
git add app/pages/pro/success.vue app/pages/pro.vue
git commit -m "feat: add success page, simplify pro page (no magic link)"
```

---

## Task 12: Remove Supabase Auth and clean up dead code

**Files:**
- Delete: `app/pages/confirm.vue`
- Delete: `server/api/auth/link-pro.post.ts`
- Delete: `server/api/pro/status.get.ts`
- Delete: `server/api/stripe/verify-session.get.ts`
- Delete: `server/utils/pro.ts`
- Modify: `nuxt.config.ts`
- Modify: `i18n/en.json`

- [ ] **Step 1: Delete dead files**

```bash
rm app/pages/confirm.vue
rm server/api/auth/link-pro.post.ts
rm server/api/pro/status.get.ts
rm server/api/stripe/verify-session.get.ts
rm server/utils/pro.ts
```

- [ ] **Step 2: Update nuxt.config.ts**

Remove `supabase.redirect`, `supabase.redirectOptions`, and `supabase.clientOptions.auth` config block. Keep `@nuxtjs/supabase` in modules (still used for database).

Simplified supabase config:
```typescript
supabase: {
  redirect: false,
},
```

Add to runtimeConfig:
```typescript
proJwtPrivateKey: '',
```

- [ ] **Step 3: Update i18n/en.json**

Remove `confirm` section entirely. Update `auth` section:
- Remove `send_link`, `check_email`, `no_subscription_banner`
- Change `already_pro` to "Already purchased?"
- Change `login_subtitle` to "Restore your purchase on this device."

Add to `pro` section:
- `restore_link`: "Already purchased? Restore here"
- `restore_email_placeholder`: "Email used at purchase"
- `restore_send_code`: "Send Code"
- `restore_code_sent`: "Code sent to {email}. Check your email."
- `restore_enter_code`: "Enter 6-digit code"
- `restore_verifying`: "Verifying..."
- `restore_success`: "Purchase restored! Eclipse Pro is active."
- `restore_error`: "Invalid or expired code. Please try again."
- `restore_no_purchase`: "No purchase found for this email."
- `success_title`: "You're all set!"
- `success_subtitle`: "Eclipse Pro is active. You're ready for August 12."
- `success_activating`: "Activating your purchase..."
- `success_delayed`: "Activation is taking longer than expected. Your payment was successful."
- `success_delayed_hint`: "If features aren't active within 5 minutes, use Restore Purchase on the Pro page."
- `success_go_map`: "Go to Eclipse Map"

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: remove Supabase Auth, clean up dead code, update i18n strings"
```

---

## Task 13: Verify build and type-check

**Files:** None (verification only)

- [ ] **Step 1: Run type-check**

```bash
cd D:/Projects/eclipsechase/eclipse-chaser/.claude/worktrees/brave-hugle && npx nuxi typecheck
```

Fix any type errors.

- [ ] **Step 2: Run build**

```bash
cd D:/Projects/eclipsechase/eclipse-chaser/.claude/worktrees/brave-hugle && npx nuxi build
```

Fix any build errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type and build errors from Pro unlock migration"
```

---

## Notes

- **RSA keys**: Generate a dev key pair during Task 1. Production keys go in Vercel env vars.
- **Public key**: Must be embedded in `useProStatus.ts` as a constant string. Generated from `openssl rsa -in private.pem -pubout`.
- **Migration**: Task 3 migration must be run against Supabase before testing the full flow. The migration drops `pro_users` — ensure any existing test data is backed up.
- **Rate limiting**: Spec calls for rate limits on restore endpoints. For MVP, we can rely on Vercel's built-in rate limiting or add simple in-memory counters. Full rate limiting can be added as a follow-up.
- **Supabase module**: Keep `@nuxtjs/supabase` in the project — it's still used for database access via `serverSupabaseServiceRole`. Only the auth features are removed.
