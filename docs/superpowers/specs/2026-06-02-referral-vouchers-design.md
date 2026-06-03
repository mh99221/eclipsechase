# Referral Program & Price Vouchers — Design

**Date:** 2026-06-02
**Status:** Approved (brainstorming) → implementation
**Author:** Martin (with Claude)

## Goal

Stretch a limited marketing budget through word-of-mouth. Introduce a
**member-gets-member referral program** for the €9.99 one-time "Eclipse Pro"
tier, built on top of a **generic voucher (discount-code) layer** that can
*also* mint one-off manual codes for press / influencers / beta testers.

The referral program is the product goal; vouchers are the mechanism that
serves it (and, as a near-free extension, serve manual marketing codes too).

## Reward model (decided)

Single-tier, two-sided, **generous** split. No tiers, no milestones, no
cumulative-cap tracking logic.

| Party | Reward | Mechanism |
|---|---|---|
| **Friend (referee)** | 20% off → pays **€7.99** | Stripe Coupon applied at Checkout |
| **Member (referrer)** | flat **€4.00 back** per successful referral | one partial refund to their original card |

Rationale: the product is niche (single event, small market), so the realistic
expectation is ~1 referral per member. Optimising for >1 (tier ladders, cap UI)
would be dead code. Stripe physically cannot refund a referrer beyond their
original €9.99 charge, so the "earn back at most what you paid" cap is a free
property of the mechanism — no app-side counter needed.

**Economics (per referred sale):** €7.99 collected − €4.00 cash-back − ~€0.55
Stripe fee ≈ **€3.40 net** per acquired paying customer. Accepted as the
channel's effective CAC.

## Two-layer architecture

```
Voucher (generic discount code)
 ├─ code             "MARGRET-7F3K" (referral)  |  "ICELAND26" (manual)
 ├─ stripe_coupon_id → reusable Stripe Coupon (20% off, 100% off, …)
 ├─ kind             'referral' | 'manual'
 ├─ referrer_id      → pro_purchases.id  (NULL for manual codes)
 ├─ max_redemptions / redeemed_count / expires_at / active
 └─ created_at
```

A referral code is just a `kind='referral'` voucher with a `referrer_id` and a
payout attached. A manual press code is the same object minted by hand with
`referrer_id = NULL` and real `max_redemptions` / `expires_at`.

### Stripe approach: reusable Coupons + our own code table

We keep **a small fixed set of Stripe Coupons** by discount value (one `20% off`
coupon for referrals, plus any value the mint script needs for manual codes).
Our `vouchers` table maps each human code → one coupon. At Checkout we attach the
coupon via `discounts: [{ coupon }]` and carry `{ voucher_code, referrer_id }` in
session `metadata`. **Attribution and redemption rules live in our DB; Stripe
just does the discount math.**

- Referral coupon id: `NUXT_STRIPE_REFERRAL_COUPON_ID` (env / runtimeConfig).
  Minting a referral code = a pure DB insert (no Stripe API call per member).
- Referrer reward amount: `400` cents EUR (constant `REFERRAL_REWARD_CENTS`).

**Alternative considered & rejected:** Stripe-native Promotion Codes (Stripe
enforces limits/expiry for you) — rejected because it means a Stripe object per
member and two divergent code paths. Our DB-owned codes give one consistent path
for referral + manual and free minting.

## Data model changes

**Migration `scripts/migrations/018-referral-vouchers.sql`.**

### `pro_purchases` — two new columns
- `payment_intent_id TEXT` — captured in the webhook so we can later refund the
  referrer. *(Today the webhook stores only `stripe_session_id`.)*
- `referral_code TEXT UNIQUE` — this buyer's own shareable code, generated at
  purchase (first-writer path, alongside `activation_token` mint).
- Backfill: generate `referral_code` for existing active rows in the migration;
  the `/api/referral/me` endpoint also lazily generates + persists one if NULL
  (defense in depth).

### New table `vouchers`
```sql
CREATE TABLE vouchers (
  code TEXT PRIMARY KEY,
  stripe_coupon_id TEXT NOT NULL,
  discount_percent INTEGER NOT NULL,        -- for display ("20% off")
  kind TEXT NOT NULL CHECK (kind IN ('referral','manual')),
  referrer_id BIGINT REFERENCES pro_purchases(id),  -- NULL for manual
  max_redemptions INTEGER,                  -- NULL = unlimited
  redeemed_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,                   -- NULL = never
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
A referral voucher and the referrer's `pro_purchases.referral_code` share the
same string. The webhook creates the matching `vouchers` row when it generates
the referral code.

### New table `voucher_redemptions`
```sql
CREATE TABLE voucher_redemptions (
  id BIGSERIAL PRIMARY KEY,
  voucher_code TEXT NOT NULL REFERENCES vouchers(code),
  referee_session_id TEXT NOT NULL UNIQUE,  -- idempotency key (webhook retries)
  referee_purchase_id BIGINT REFERENCES pro_purchases(id),
  reward_status TEXT NOT NULL DEFAULT 'none'
    CHECK (reward_status IN ('none','paid','failed')),
  reward_cents INTEGER NOT NULL DEFAULT 0,
  stripe_refund_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
`referee_session_id UNIQUE` is the double-payout guard: a webhook retry hits the
unique violation and short-circuits. `reward_status`:
- `none` — discount used, but no referrer payout (manual code, or self-referral).
- `paid` — €4 refunded to referrer.
- `failed` — refund attempt errored (e.g. 180-day window) → manual follow-up.

## Flow (end to end)

1. **Member buys Pro** → `webhook.post.ts` (`checkout.session.completed`):
   - additionally store `payment_intent_id` (from `session.payment_intent`).
   - on the first-writer path (where `activation_token` is minted), also generate
     a unique `referral_code`, write it to `pro_purchases`, and insert the
     matching `kind='referral'` row into `vouchers` (coupon =
     `NUXT_STRIPE_REFERRAL_COUPON_ID`, `discount_percent=20`).
   - welcome email (`sendPurchaseEmail`) now includes the shareable link.
2. **Member shares** `https://eclipsechase.is/pro?ref=MARGRET-7F3K`.
3. **Friend lands on `/pro`** → `?ref=` validated via new
   `POST /api/vouchers/validate` → price card shows `€9.99 → €7.99` + "Your
   friend gave you 20% off." Also a manual **"Have a code?"** input using the
   same endpoint.
4. **Friend checks out** → `checkout.post.ts` **re-validates** the code
   server-side (never trust client), attaches the coupon via
   `discounts: [{ coupon }]`, and sets `metadata = { product, voucher_code,
   referrer_id }`.
5. **Friend's `checkout.session.completed`** (same webhook) → if
   `metadata.voucher_code` present:
   - insert `voucher_redemptions` row (unique on `referee_session_id`);
     on conflict, stop (already processed).
   - increment `vouchers.redeemed_count`.
   - if `kind='referral'` AND not a self-referral → issue **€4 partial refund**
     to the referrer's `payment_intent_id` (Stripe idempotency key =
     referee session id) → set `reward_status='paid'`, store `stripe_refund_id`
     → send referrer-reward email.
   - else → `reward_status='none'`.
   - on refund error → `reward_status='failed'`, log, no throw.

The referral payout rides on the friend's purchase webhook — **no cron / job.**

## Server endpoints

- **`POST /api/vouchers/validate`** (new) — body `{ code }`. Returns
  `{ valid, discount_percent, kind, referrer_masked? }`. Rate-limited
  (`checkDbRateLimit`, mirrors `pro/lookup.post.ts`). Validity = `active` AND not
  expired AND `redeemed_count < max_redemptions` (or unlimited). Does **not**
  leak referrer email beyond a masked form.
- **`POST /api/referral/me`** (new) — gated by `requirePro(event)` (Bearer JWT;
  uses `claims.pid`). Returns `{ code, link, joined_count, earned_eur,
  pending_count }` computed from `vouchers` + `voucher_redemptions`. Lazily
  generates `referral_code` if the row predates the feature.
- **`POST /api/stripe/checkout`** (edit) — accept optional `voucher_code`;
  re-validate server-side; attach coupon + metadata.
- **`POST /api/stripe/webhook`** (edit) — store `payment_intent_id`; generate
  referral code + voucher row on first write; process redemption + refund on
  referred purchases (logic above).

## Client surfaces

- **`/me` referral card** — new `app/components/ReferralCard.vue` rendered in
  `me.vue` (already `pro-gate`d). Shows code + shareable link, copy button +
  `navigator.share`, plain-language explainer, and tally ("1 friend joined · €4
  earned"; "reward pending" if any `failed`). Fetches `/api/referral/me` with the
  Bearer token from `useProStatus()`.
- **`/pro` discount UX** (`pages/pro/index.vue`) — read `?ref=` on mount →
  validate → discount banner above price card, strike-through `€9.99 → €7.99`.
  The €4 referrer reward is **not** shown to the friend. Add a "Have a code?"
  input for manually-typed codes (same validate endpoint; invalid/expired/maxed
  → inline error, full price). Pass the validated `voucher_code` into the
  checkout call.

## Emails (`server/utils/email.ts`)

- `sendPurchaseEmail` — add the member's referral link + a one-line "give 20%,
  get €4 back" explainer (EN + IS strings, keep arms in sync).
- **New `sendReferralRewardEmail(to, locale, { amountEur })`** — "A friend joined
  — €4 is on its way back to your card." Reuses the shared HTML chrome.

## Fraud, abuse & edge cases

- **Self-referral:** at payout time compare referee `email_hash` with the
  referrer's `pro_purchases.email_hash`. Equal → discount still applies, but **no
  refund**, `reward_status='none'`. (We don't block the friend's discount; we
  just don't pay a self-referrer.)
- **Reused-link grinding:** the discount is low-stakes; payouts are the guarded
  surface. Stripe's hard refund ceiling (≤ original €9.99) bounds the worst case
  to "referrer's Pro became free." No counter needed for referral codes.
- **Manual codes** enforce real `max_redemptions` + `expires_at` in *both* the
  validate endpoint and the webhook (re-check) so a race can't over-redeem a
  100%-off comp.
- **Refund fails** (180-day window passed / any Stripe error) → `reward_status
  ='failed'`, logged, surfaced in the member card as "reward pending." Low volume
  → manual follow-up; no auto-retry machinery.
- **Friend refunds/charges back after referrer paid** → rare (one-time product +
  withdrawal waiver). **Accepted, bounded exposure** — no clawback logic.
- **Code present but referrer missing/inactive** → treat as plain manual discount
  if the coupon resolves; else full price with inline notice.

## Admin / minting (no UI)

Solo-dev minimal surface. Manual codes are minted via a small helper
`scripts/mint-voucher.mjs`:
```
node scripts/mint-voucher.mjs --code ICELAND26 --discount 30 --max 200 --expires 2026-08-13
```
It ensures a Stripe Coupon for the discount exists (create-or-reuse) and inserts
the `vouchers` row (`kind='manual'`, `referrer_id=NULL`). Referral codes need no
minting — auto-created on purchase.

## Configuration

New env / runtimeConfig:
- `NUXT_STRIPE_REFERRAL_COUPON_ID` — the shared 20%-off Stripe Coupon for
  referrals (created once in the Stripe dashboard or by the mint script).

Constants (server):
- `REFERRAL_REWARD_CENTS = 400`
- `REFERRAL_DISCOUNT_PERCENT = 20`

## Testing

- `vouchers/validate`: valid / expired / inactive / maxed-out / unknown code.
- Webhook referral path: happy path issues one €4 refund + `paid`; retry
  (duplicate `referee_session_id`) is a no-op (no second refund).
- **Self-referral guard:** referee email == referrer email → discount, no refund,
  `reward_status='none'`.
- Refund failure → `reward_status='failed'`, no throw.
- `referral/me`: requires Pro JWT; returns correct tally; lazy code generation
  for pre-feature rows.
- Manual code over-redemption race re-checked at webhook.

## Build surface (summary)

- **Schema:** migration 018 — 2 columns on `pro_purchases`, 2 new tables, backfill.
- **Server:** edit `stripe/checkout.post.ts`, `stripe/webhook.post.ts`; new
  `vouchers/validate.post.ts`, `referral/me.post.ts`; refund helper + email.
- **Client:** `components/ReferralCard.vue` in `me.vue`; discount banner + code
  field in `pro/index.vue`.
- **Email:** `email.ts` — purchase-email addition + `sendReferralRewardEmail`.
- **i18n:** new keys in `i18n/en.json` (+ IS fallback in `i18n/is.json`).
- **Script:** `scripts/mint-voucher.mjs`.
- **Config:** `NUXT_STRIPE_REFERRAL_COUPON_ID` in `.env.example` + `nuxt.config.ts`.
- **Tests:** `tests/server/api/` coverage per above.

## Explicitly out of scope (YAGNI)

- Reward tiers / milestones / cumulative-cap UI.
- Clawback on referee refund/chargeback.
- Admin web UI (script-based minting only).
- Auto-retry of failed refunds.
- Paying referrers beyond their purchase price (no Stripe Connect).
