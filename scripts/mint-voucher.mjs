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

if (!code || !discount) {
  console.error('Usage: --code CODE --discount PERCENT [--max N] [--expires YYYY-MM-DD]')
  process.exit(1)
}
if (!Number.isInteger(discount) || discount < 1 || discount > 100) {
  console.error('--discount must be an integer between 1 and 100')
  process.exit(1)
}

let max = null
if (arg('max')) {
  max = parseInt(arg('max'), 10)
  if (!Number.isInteger(max) || max < 1) {
    console.error('--max must be a positive integer')
    process.exit(1)
  }
}

let expires = null
let redeemBy = null
if (arg('expires')) {
  const d = new Date(arg('expires'))
  if (Number.isNaN(d.getTime())) {
    console.error('--expires must be a valid date (e.g. 2026-08-13)')
    process.exit(1)
  }
  expires = d.toISOString()
  redeemBy = Math.floor(d.getTime() / 1000)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Push the cap + expiry onto the Stripe coupon too, so Stripe enforces them
// at checkout — our redeemed_count is only bumped post-payment and can be
// raced. A maxed/expired coupon degrades to full price rather than failing
// (see the retry in server/api/stripe/checkout.post.ts).
const coupon = await stripe.coupons.create({
  percent_off: discount,
  duration: 'once',
  name: `${discount}% off`,
  ...(max != null ? { max_redemptions: max } : {}),
  ...(redeemBy != null ? { redeem_by: redeemBy } : {}),
})

const { error } = await supabase.from('vouchers').insert({
  code, stripe_coupon_id: coupon.id, discount_percent: discount,
  kind: 'manual', referrer_id: null, max_redemptions: max, expires_at: expires,
})
if (error) { console.error('Insert failed:', error.message); process.exit(1) }

console.log(`Minted ${code}: ${discount}% off (coupon ${coupon.id})${max ? `, max ${max}` : ''}${expires ? `, expires ${expires}` : ''}`)
