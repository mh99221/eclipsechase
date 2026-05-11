import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { config } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Read en.json at runtime via fs — `import enMessages from … json`
// goes through @intlify/unplugin-vue-i18n which compiles each string
// into an AST node, leaving us with `{ type, body, loc }` shapes
// instead of strings. fs.readFileSync + JSON.parse sidesteps that.
const enJsonPath = resolve(process.cwd(), 'i18n/en.json')
const enMessages = JSON.parse(readFileSync(enJsonPath, 'utf8')) as Record<string, unknown>

// Resolve a dotted i18n key against the real en.json so component tests
// asserting on rendered text (e.g. "Already purchased", "Map tiles") see
// the same strings users would, not the raw key. Falls back to the key
// itself when not found, matching the previous passthrough behaviour
// for tests that intentionally assert on keys.
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

function interpolate(template: string, params?: Record<string, unknown>): string {
  // Handle vue-i18n's "static text" escape — `{'@'}` renders a literal `@`,
  // `{'{'}` renders `{`, etc. en.json's `restore.email_placeholder` uses
  // this so the `@` isn't mis-parsed as a linked-key reference.
  let out = template.replace(/\{'([^']+)'\}/g, '$1')
  if (params) {
    out = out.replace(/\{(\w+)\}/g, (_, name) =>
      name in params ? String(params[name]) : `{${name}}`,
    )
  }
  return out
}

// Global component stubs for component tests.
//
// `@nuxtjs/i18n`'s NuxtLinkLocale requires the plugin context
// (_nuxtI18n.composableCtx) which never installs in the Vitest runtime.
// We stub it as a plain anchor that forwards `to` to `href` so tests
// that assert link existence / href still work, without needing
// per-test mounting plugins.
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

// Global @nuxtjs/i18n composables stub. The runtime helpers throw
// "i18n context is not initialized" without the plugin context that
// only the full Nuxt app provides. Components reach for these via
// auto-imports (`useLocalePath()`, `useRouteBaseName()`, etc.), which
// resolve at compile time to imports from
// `@nuxtjs/i18n/dist/runtime/composables/index.js` — stub that module
// to return passthrough implementations safe for unit tests.
// @nuxtjs/i18n runtime composables (useRouteBaseName, useLocalePath,
// etc.) are redirected to tests/mocks/nuxt-i18n-composables.ts via
// vitest's resolve.alias — see vitest.config.ts.

// Global i18n stub for component tests.
//
// `nuxt.config.ts` configures @nuxtjs/i18n with `lazy: true`, so locale
// messages aren't loaded in the Vitest runtime. Without this stub, any
// component calling `useI18n()` throws `[intlify] Must be called at
// setup top level` because the i18n plugin never installed. The
// passthrough returns:
//   - `t(key, fallback?)` echoes the key (or the fallback if provided)
//   - `tm(key)` returns `[]` (Checklist.vue iterates this)
//   - `te(key)` returns `true` (ProfileSelector.vue gates on this)
//   - `locale` / `locales` are refs to keep components that read .value happy
// Component tests can still override with their own `vi.mock('vue-i18n', …)`
// if they need richer behaviour — vi.mock at the top of a test file takes
// precedence over setup-file mocks.
vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useI18n: () => ({
      // Real-translation lookup so component tests asserting on
      // user-visible English text (e.g. "Already purchased") match. The
      // second arg can be either a default-string fallback OR an
      // interpolation params object — vue-i18n's `t()` is overloaded.
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
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
