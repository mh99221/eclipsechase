// IndexNow (indexnow.org) — push notification for search engine crawlers
// (Bing, Yandex; picked up by others sharing the protocol). Key must match
// the file at public/<INDEXNOW_KEY>.txt, which IndexNow fetches to verify
// domain ownership before accepting submissions.
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const INDEXNOW_HOST = 'eclipsechase.is'
export const INDEXNOW_KEY = '41ef8bda341fb8ee53c21df5dae731c1'

export async function submitIndexNow(urls: string[]) {
  if (!urls.length) return { submitted: 0, status: null }

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
  })

  // IndexNow returns 200 or 202 on success; anything else is a real failure.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow submission failed: ${res.status} ${await res.text()}`)
  }

  return { submitted: urls.length, status: res.status }
}
