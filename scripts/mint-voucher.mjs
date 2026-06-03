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
