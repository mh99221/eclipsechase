import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitIndexNow, INDEXNOW_KEY } from '../../../server/utils/indexnow'

describe('submitIndexNow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('returns submitted: 0 without calling fetch for an empty list', async () => {
    const result = await submitIndexNow([])
    expect(result).toEqual({ submitted: 0, status: null })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('posts host/key/keyLocation/urlList to the IndexNow endpoint', async () => {
    ;(global.fetch as any).mockResolvedValue({ status: 200, text: () => Promise.resolve('') })

    await submitIndexNow(['https://eclipsechase.is/', 'https://eclipsechase.is/guide/'])

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.indexnow.org/indexnow',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body)
    expect(body).toEqual({
      host: 'eclipsechase.is',
      key: INDEXNOW_KEY,
      keyLocation: `https://eclipsechase.is/${INDEXNOW_KEY}.txt`,
      urlList: ['https://eclipsechase.is/', 'https://eclipsechase.is/guide/'],
    })
  })

  it('treats 202 as success', async () => {
    ;(global.fetch as any).mockResolvedValue({ status: 202, text: () => Promise.resolve('') })
    const result = await submitIndexNow(['https://eclipsechase.is/'])
    expect(result).toEqual({ submitted: 1, status: 202 })
  })

  it('throws when IndexNow rejects the submission', async () => {
    ;(global.fetch as any).mockResolvedValue({ status: 422, text: () => Promise.resolve('Invalid key') })
    await expect(submitIndexNow(['https://eclipsechase.is/'])).rejects.toThrow('422')
  })
})
