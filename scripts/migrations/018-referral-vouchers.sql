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
