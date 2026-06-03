import { describe, it, expect } from 'vitest'
import { referralRewardContent, purchaseHtml, sendReferralRewardEmail } from '../../../server/utils/email'

describe('referralRewardContent', () => {
  it('builds an EN reward email mentioning the amount', () => {
    const { subject, html } = referralRewardContent('en', 4)
    expect(subject).toMatch(/friend/i)
    expect(html).toContain('€4')
  })

  it('builds an IS reward email', () => {
    const { subject, html } = referralRewardContent('is', 4)
    expect(subject).toMatch(/[Vv]inur/)
    expect(html).toContain('€4')
  })
})

describe('purchaseHtml referral block', () => {
  it('includes the referral link when provided', () => {
    const html = purchaseHtml('en', 'https://eclipsechase.is/pro?ref=ABCD2345')
    expect(html).toContain('https://eclipsechase.is/pro?ref=ABCD2345')
  })

  it('omits the referral block when no link is given', () => {
    const html = purchaseHtml('en')
    expect(html).not.toContain('?ref=')
  })
})

describe('sendReferralRewardEmail', () => {
  it('returns without throwing when Resend is not configured', async () => {
    // No runtime Resend key in the test env → getResend() returns null and
    // the function logs + returns. Verifies the no-op delivery path.
    await expect(sendReferralRewardEmail('member@x.com', 'en', { amountEur: 4 })).resolves.toBeUndefined()
  })
})
