const DB_NAME = 'eclipsechase'
const STORE_NAME = 'pro'
const TOKEN_KEY = 'activation_token'
const LS_KEY = 'eclipsechase_pro_token'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

// One-time cleanup of the legacy localStorage mirror. The token lives
// in IndexedDB only now (drops the XSS-readable surface) — but earlier
// builds wrote it to localStorage too, so existing users still have a
// copy there. Strip it on every load until everyone's migrated.
function clearLegacyLocalStorage(): void {
  try { localStorage.removeItem(LS_KEY) } catch {}
}

export async function saveTokenToIndexedDB(token: string): Promise<void> {
  clearLegacyLocalStorage()
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(token, TOKEN_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getTokenFromIndexedDB(): Promise<string | null> {
  try {
    const db = await openDB()
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(TOKEN_KEY)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

export async function removeTokenFromIndexedDB(): Promise<void> {
  clearLegacyLocalStorage()

  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(TOKEN_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // IndexedDB might not be available
  }
}
