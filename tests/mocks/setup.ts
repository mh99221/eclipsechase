import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { config } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// happy-dom's localStorage is missing `setItem` in some versions, which
// makes @nuxtjs/color-mode log a TypeError on every mount. Map-backed
// stubs cleared between tests below.
function createStorageStub(): Storage & { _store: Map<string, string> } {
  const _store = new Map<string, string>()
  return {
    _store,
    get length() { return _store.size },
    clear: () => _store.clear(),
    getItem: (key) => (_store.has(key) ? _store.get(key)! : null),
    setItem: (key, value) => { _store.set(key, String(value)) },
    removeItem: (key) => { _store.delete(key) },
    key: (index) => Array.from(_store.keys())[index] ?? null,
  }
}

const localStorageStub = createStorageStub()
const sessionStorageStub = createStorageStub()

if (typeof globalThis.window !== 'undefined' && globalThis.window) {
  Object.defineProperty(globalThis.window, 'localStorage', {
    value: localStorageStub, writable: true, configurable: true,
  })
  Object.defineProperty(globalThis.window, 'sessionStorage', {
    value: sessionStorageStub, writable: true, configurable: true,
  })
}

// `import enMessages from 'i18n/en.json'` goes through
// @intlify/unplugin-vue-i18n which compiles each string into an AST node;
// fs.readFileSync + JSON.parse sidesteps that.
const enJsonPath = resolve(process.cwd(), 'i18n/en.json')
const enMessages = JSON.parse(readFileSync(enJsonPath, 'utf8')) as Record<string, unknown>

function lookupMessage(key: string): string {
  const parts = key.split('.')
  let cur: unknown = enMessages as unknown
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return key
    }
  }
  return typeof cur === 'string' ? cur : key
}

// vue-i18n's "static text" escape — `{'@'}` renders a literal `@` so
// the `@` in restore.email_placeholder isn't parsed as a linked-key ref.
const STATIC_ESCAPE_RE = /\{'([^']+)'\}/g
const PARAM_RE = /\{(\w+)\}/g

function interpolate(template: string, params?: Record<string, unknown>): string {
  let out = template.replace(STATIC_ESCAPE_RE, '$1')
  if (params) {
    out = out.replace(PARAM_RE, (_, name) =>
      name in params ? String(params[name]) : `{${name}}`,
    )
  }
  return out
}

// NuxtLinkLocale needs `_nuxtI18n.composableCtx` which never installs in
// Vitest — stub as a plain anchor so href / slot assertions still work.
config.global.stubs = {
  ...(config.global.stubs || {}),
  NuxtLinkLocale: defineComponent({
    name: 'NuxtLinkLocale',
    props: ['to', 'href', 'external', 'target', 'rel'],
    setup(props, { slots, attrs }) {
      return () => h(
        'a',
        {
          href: typeof props.to === 'string' ? props.to : (props.href ?? '#'),
          target: props.target,
          rel: props.rel,
          ...attrs,
        },
        slots.default?.(),
      )
    },
  }),
}

// @nuxtjs/i18n composables (useRouteBaseName, useLocalePath, …) need the
// plugin context the full Nuxt app provides. Redirected to
// tests/mocks/nuxt-i18n-composables.ts via vitest's resolve.alias —
// see vitest.config.ts.

// useI18n stub resolves keys against the real en.json so component tests
// assert on user-visible strings, not raw keys. Per-file vi.mock takes
// precedence if a test needs richer behaviour.
vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useI18n: () => ({
      // Second arg is either a default-string fallback OR interpolation
      // params — vue-i18n's `t()` is overloaded.
      t: (k: string, fallbackOrParams?: string | Record<string, unknown>) => {
        const msg = lookupMessage(k)
        if (msg !== k) {
          return typeof fallbackOrParams === 'object'
            ? interpolate(msg, fallbackOrParams)
            : interpolate(msg)
        }
        return typeof fallbackOrParams === 'string' ? fallbackOrParams : k
      },
      tm: (k: string) => {
        const v = lookupMessage(k)
        return Array.isArray(v) ? v : []
      },
      te: () => true,
      locale: { value: 'en' },
      locales: { value: [{ code: 'en', name: 'English' }, { code: 'is', name: 'Íslenska' }] },
    }),
  }
})

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => {
  server.resetHandlers()
  // Prevent storage state leaking between tests (e.g. a test setting
  // ec-color-mode would otherwise persist into the next test's mount).
  localStorageStub.clear()
  sessionStorageStub.clear()
})
afterAll(() => server.close())
