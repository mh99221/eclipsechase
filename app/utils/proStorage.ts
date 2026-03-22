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

export async function saveTokenToIndexedDB(token: string): Promise<void> {
  // Always save to localStorage as reliable backup
  try { localStorage.setItem(LS_KEY, token) } catch {}

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(token, TOKEN_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getTokenFromIndexedDB(): Promise<string | null> {
  // Try IndexedDB first, fall back to localStorage
  try {
    const db = await openDB()
    const token = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(TOKEN_KEY)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
    if (token) return token
  } catch {
    // IndexedDB failed, try localStorage
  }

  // Fallback: check localStorage
  try {
    return localStorage.getItem(LS_KEY)
  } catch {
    return null
  }
}

export async function removeTokenFromIndexedDB(): Promise<void> {
  try { localStorage.removeItem(LS_KEY) } catch {}

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
