/**
 * Shared test helpers for server API route tests.
 */
import { vi } from 'vitest'
import { createEvent, type H3Event } from 'h3'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'

// ---------------------------------------------------------------------------
// Mock Supabase client builder
// ---------------------------------------------------------------------------

/**
 * Build a chainable mock Supabase client.
 * Every chaining method (.select, .eq, etc.) returns a thenable object
 * so `await supabase.from('x').select('*')` resolves to { data, error }.
 * The top-level client is NOT thenable (so `await serverSupabaseServiceRole(event)`
 * returns the mock client, not { data, error }).
 */
export function createMockSupabase() {
  const state = { data: null as unknown, error: null as unknown }
  // FIFO queue of per-call results. Consumed by the next terminal call;
  // when empty, falls back to `state.data` (the legacy single-result mode).
  const resultQueue: Array<{ data: unknown; error: unknown }> = []

  const terminal = () => {
    if (resultQueue.length > 0) {
      const next = resultQueue.shift()!
      return Promise.resolve({ data: next.data, error: next.error })
    }
    return Promise.resolve({ data: state.data, error: state.error })
  }

  const thenableChain: Record<string, any> = {}
  const chainMethods = [
    'select', 'insert', 'upsert', 'update', 'delete',
    'eq', 'gte', 'gt', 'lte', 'lt', 'order', 'limit', 'neq', 'in', 'is',
  ]
  for (const m of chainMethods) {
    thenableChain[m] = vi.fn().mockImplementation(() => thenableChain)
  }
  thenableChain.single = vi.fn().mockImplementation(terminal)
  thenableChain.maybeSingle = vi.fn().mockImplementation(terminal)
  // `await supabase.from('x').select('*')` resolves via this hook.
  thenableChain.then = (resolve: any, reject: any) => terminal().then(resolve, reject)

  const client: Record<string, any> = {
    from: vi.fn().mockImplementation(() => thenableChain),
  }

  // Expose chain methods directly on client for assertion convenience
  // (e.g., mockSupabase.select, mockSupabase.eq, etc.)
  for (const m of chainMethods) {
    client[m] = thenableChain[m]
  }
  client.single = thenableChain.single
  client.maybeSingle = thenableChain.maybeSingle

  /** Set the fallback result for any terminal call. */
  const setResult = (data: unknown, error: unknown = null) => {
    state.data = data
    state.error = error
  }

  /** Queue per-call results — consumed FIFO. Handlers that touch the DB
   *  multiple times (webhook upsert → select → update, etc.) need to
   *  return distinct shapes per step; the legacy single-result mode
   *  returned the same value for every terminal call. */
  const queueResults = (...results: Array<{ data?: unknown; error?: unknown }>) => {
    for (const r of results) {
      resultQueue.push({ data: r.data ?? null, error: r.error ?? null })
    }
  }

  return { client: client as any, setResult, queueResults, state }
}

// ---------------------------------------------------------------------------
// H3 event factory
// ---------------------------------------------------------------------------

/**
 * Create a minimal H3 event for testing server handlers.
 * Pre-sets `_supabaseServiceRole` in context so the real
 * `serverSupabaseServiceRole()` returns our mock client.
 */
export function createTestEvent(options: {
  supabase?: any
  body?: any
  query?: Record<string, string>
  params?: Record<string, string>
  headers?: Record<string, string>
  rawBody?: string
} = {}): H3Event {
  const socket = new Socket()
  const req = new IncomingMessage(socket)
  req.method = 'POST'
  req.url = '/test'

  // Set headers
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      req.headers[key.toLowerCase()] = value
    }
  }

  const res = new ServerResponse(req)
  const event = createEvent(req, res)

  // Pre-set supabase in context so serverSupabaseServiceRole returns our mock
  if (options.supabase) {
    event.context._supabaseServiceRole = options.supabase
  }

  // Pre-set params for getRouterParam
  if (options.params) {
    event.context.params = options.params
  }

  // Pre-set body for readBody
  if (options.body !== undefined) {
    ;(event as any)._body = options.body
    ;(event as any)._requestBody = options.body
  }

  // Pre-set raw body for readRawBody
  // H3's readRawBody reads from the request stream, so we push data into it
  if (options.rawBody !== undefined) {
    ;(event as any)._rawBody = options.rawBody
    // Also push data into the request stream for H3's readRawBody
    req.push(options.rawBody)
    req.push(null) // signal end of stream
    req.headers['content-length'] = String(Buffer.byteLength(options.rawBody))
    if (!req.headers['content-type']) {
      req.headers['content-type'] = 'text/plain'
    }
  }

  // Pre-set query for getQuery
  if (options.query) {
    const qs = new URLSearchParams(options.query).toString()
    req.url = `/test?${qs}`
  }

  return event
}
