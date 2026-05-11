/**
 * Test-time stub for `@nuxtjs/i18n/dist/runtime/composables/index`.
 *
 * The real file calls `useComposableContext()` which throws unless the
 * full Nuxt app + i18n plugin is booted — too heavy for unit tests.
 * Components reach for these helpers via Nuxt auto-imports, so we
 * redirect the deep file path to this stub via vitest's `resolve.alias`
 * (see vitest.config.ts). Each helper returns a safe passthrough that
 * matches the real signature closely enough for tests that assert on
 * rendered links and base-route names.
 */
import { ref } from 'vue'

export const useLocalePath = () => (path: string) => path
export const useLocaleRoute = () => (path: string | { path: string }) =>
  typeof path === 'string' ? { path } : path
export const useSwitchLocalePath = () => () => '/'
export const useRouteBaseName = () => (route: any) =>
  typeof route?.name === 'string' ? route.name : ''
export const useLocaleHead = () => ({})
export const useBrowserLocale = () => 'en'
export const useCookieLocale = () => ref('en')
export const useSetI18nParams = () => () => {}
export const useI18nPreloadKeys = () => () => {}
export const defineI18nRoute = () => {}
export const defineI18nLocale = () => () => Promise.resolve({})
export const defineI18nConfig = (cfg: any) => cfg
