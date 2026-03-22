let counter = 0

export function resetPurchaseCounter() {
  counter = 0
}

export function createPurchase(overrides: Record<string, unknown> = {}) {
  counter++

  return {
    id: counter,
    email: `buyer${counter}@test.com`,
    email_hash: `hash_${counter}_abc123`,
    stripe_session_id: `cs_test_${counter}`,
    activation_token: `eyJhbGciOiJSUzI1NiJ9.mock_token_${counter}`,
    purchased_at: '2026-07-01T12:00:00Z',
    is_active: true,
    restored_count: 0,
    last_restored_at: null,
    ...overrides,
  }
}
