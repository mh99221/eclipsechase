import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase, setResult } = createMockSupabase()
const mockSubmitIndexNow = vi.fn()

vi.mock('../../../../server/utils/indexnow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../server/utils/indexnow')>()
  return {
    ...actual,
    submitIndexNow: (...args: any[]) => mockSubmitIndexNow(...args),
  }
})

const { default: handler } = await import('../../../../server/api/tasks/indexnow.post')

describe('POST /api/tasks/indexnow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubmitIndexNow.mockResolvedValue({ submitted: 0, status: 200 })
  })

  it('submits static pages for both locales plus every spot slug', async () => {
    setResult([{ slug: 'stykkisholmur-harbour' }, { slug: 'londrangar' }])

    const event = createTestEvent({ supabase: mockSupabase })
    await handler(event)

    expect(mockSubmitIndexNow).toHaveBeenCalledTimes(1)
    const urls: string[] = mockSubmitIndexNow.mock.calls[0][0]

    // Static pages, en + is
    expect(urls).toContain('https://eclipsechase.is/')
    expect(urls).toContain('https://eclipsechase.is/is/')
    expect(urls).toContain('https://eclipsechase.is/guide/')
    expect(urls).toContain('https://eclipsechase.is/is/guide/')
    // Spot slugs, en + is
    expect(urls).toContain('https://eclipsechase.is/spots/stykkisholmur-harbour/')
    expect(urls).toContain('https://eclipsechase.is/is/spots/stykkisholmur-harbour/')
    expect(urls).toContain('https://eclipsechase.is/spots/londrangar/')
    // Pro-gated routes are never submitted
    expect(urls.some(u => u.includes('/dashboard') || u.includes('/map') || u.includes('/me'))).toBe(false)
  })

  it('returns the submission result with a timestamp', async () => {
    setResult([])
    mockSubmitIndexNow.mockResolvedValue({ submitted: 14, status: 202 })

    const result = await handler(createTestEvent({ supabase: mockSupabase }))

    expect(result).toMatchObject({ submitted: 14, status: 202 })
    expect(typeof result.timestamp).toBe('string')
  })

  it('handles no spots gracefully, still submitting the static /spots/ listing page', async () => {
    setResult(null)
    await handler(createTestEvent({ supabase: mockSupabase }))

    const urls: string[] = mockSubmitIndexNow.mock.calls[0][0]
    // '/spots/' itself is a static path (en + is); no per-slug detail pages.
    expect(urls.filter(u => u.includes('/spots/'))).toEqual([
      'https://eclipsechase.is/spots/',
      'https://eclipsechase.is/is/spots/',
    ])
  })
})
