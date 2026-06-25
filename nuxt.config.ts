// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxtjs/supabase',
    '@nuxt/content',
    '@nuxtjs/sitemap',
    '@nuxtjs/color-mode',
    'nuxt-og-image',
  ],

  // Satori-rendered OG cards. Template lives at
  // app/components/OgImage/OgImageDefault.satori.vue and is bundled by
  // page-level `defineOgImageComponent('Default', { ... })` calls.
  //
  // nuxt-og-image v6 removed the `fonts` option — fonts now come from
  // the @nuxt/fonts module. We don't ship @nuxt/fonts, so Satori falls
  // back to its bundled Inter, which is close enough to Inter Tight for
  // OG cards (Tight is just a tighter-tracking sibling of Inter). The
  // mono blocks in the template degrade to system monospace, which is
  // acceptable for social previews.
  ogImage: {
    defaults: {
      component: 'Default',
      extension: 'png',
      width: 1200,
      height: 630,
      // Generated PNG is deterministic per route; one-week edge cache is
      // safe (rebuild flushes Vercel's cache anyway). Per-route overrides
      // possible via the defineOgImageComponent call.
      cacheMaxAgeSeconds: 60 * 60 * 24 * 7,
    },
  },

  colorMode: {
    preference: 'dark',      // fallback when user has no system / stored preference
    fallback: 'dark',        // SSR fallback — keeps the brand canonical
    classSuffix: '',         // so html gets `dark` or `light` (no `-mode` suffix)
    storageKey: 'ec-color-mode',
  },

  site: {
    url: 'https://eclipsechase.is',
    // Match Vercel's trailingSlash:true (vercel.json) so @nuxtjs/sitemap
    // emits trailing-slash <loc> URLs that agree with the served pages,
    // canonical tags, and hreflang alternates. Without this the sitemap
    // lists /spots/x while Vercel serves /spots/x/, the mismatch that
    // suppressed indexing. Page canonicals use canonicalize() (app/utils
    // /eclipse.ts) to match.
    trailingSlash: true,
  },

  app: {
    head: {
      title: 'Find Clear Skies on Eclipse Day',
      titleTemplate: '%s — EclipseChase.is',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Real-time weather tracking for the August 12, 2026 total solar eclipse in Iceland. Find the clearest skies on eclipse day.' },
        { name: 'theme-color', content: '#050810' },
        // Open Graph
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:locale:alternate', content: 'is_IS' },
        { property: 'og:site_name', content: 'EclipseChase.is' },
        { property: 'og:title', content: 'EclipseChase.is — Find Clear Skies on Eclipse Day' },
        { property: 'og:description', content: 'Real-time weather tracking for the August 12, 2026 total solar eclipse in Iceland.' },
        { property: 'og:type', content: 'website' },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'EclipseChase.is — Find Clear Skies on Eclipse Day' },
        { name: 'twitter:description', content: 'Real-time weather tracking for the August 12, 2026 total solar eclipse in Iceland.' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'preload', as: 'style', href: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap', onload: "this.onload=null;this.rel='stylesheet'" },
        // mapbox-gl.css is no longer preloaded globally — the upstream
        // fetch set Mapbox session cookies on every visit. Map-using
        // components import the stylesheet themselves so it ships only
        // with their chunk.
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  // Flatten auto-import names so nested folders (ui/, spot-detail/, home/, etc.)
  // can be referenced as <Pill>, <SpotHeroBlock> rather than <UiPill>, <SpotDetailSpotHeroBlock>.
  // The `content/` subfolder is excluded — Nuxt Content registers those via its own rules.
  components: [
    { path: '~/components/content', prefix: '' },
    { path: '~/components', pathPrefix: false },
  ],


  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'is', name: 'Íslenska', file: 'is.json' },
    ],
    defaultLocale: 'en',
    langDir: '../i18n',
    strategy: 'prefix_except_default',
  },

  supabase: {
    redirect: false,
  },

  // Sitemap module — declare the dynamic spot-slug source explicitly so
  // the module's build-time analysis sees it. Without this, it logs a
  // misleading "No dynamic sources detected" hint suggesting zeroRuntime,
  // which would bake the sitemap into a static file and stop reflecting
  // spots added/edited in Supabase until the next redeploy. The handler
  // itself lives at server/api/__sitemap__/urls.ts.
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
    // Stamp <lastmod> on every URL so Google can tell pages changed and
    // prioritise a re-crawl (closes the gap where the sitemap shipped no
    // lastmod at all). autoLastmod covers the static/discovered routes from
    // their build-time file mtime (≈ deploy time on Vercel, which checks out
    // fresh each build). The dynamic /spots/<slug> URLs have no page file for
    // autoLastmod to read, so they carry an explicit lastmod set from
    // runtimeConfig.buildDate in server/api/__sitemap__/urls.ts.
    autoLastmod: true,
  },

  routeRules: {
    // Pages
    // Landing is a static marketing shell — no per-request server data
    // (horizon data is a build-time import, the Pro track hydrates
    // client-side, JSON-LD is static). Prerendering it serves the audited
    // entry page as static CDN HTML and, crucially, lets the build-time
    // beasties pass (see nitro:init hook below) inline critical CSS and
    // de-block the entry stylesheet — the render-blocking Lighthouse audit
    // only goes green for routes that exist as HTML at build time.
    '/': { prerender: true },
    '/guide': { prerender: true },
    '/pro': { ssr: true },
    '/privacy': { prerender: true },
    '/terms': { prerender: true },
    // Pro-gated routes render client-only — Pro status lives in the
    // browser's IndexedDB (RS256 JWT), so the server can't know who is
    // entitled. SPA-rendering them lets pro-gate middleware redirect
    // free users to /pro before any gated markup is painted, killing
    // the "flash of dashboard content" bug.
    '/dashboard': { ssr: false },
    '/map': { ssr: false },
    '/spots': {
      ssr: true,
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    },
    '/spots/**': { isr: 3600 },

    // API edge-caching is set in the handlers themselves via
    // setResponseHeader (server/api/spots/index.get.ts and
    // server/api/weather/*.get.ts), NOT here. A routeRules `headers` rule
    // keyed to the no-slash path silently no-ops under trailingSlash:true:
    // Vercel rewrites the request to /api/*/, which never matches the
    // exact `/api/*` Vercel header-route, so the header is dropped. Setting
    // it on the response in-handler is slash-independent and actually
    // reaches the edge.
  },

  nitro: {
    serverAssets: [
      { baseName: 'dem', dir: './server/data/dem' },
      { baseName: 'eclipse-data', dir: './public/eclipse-data' },
    ],
  },

  // Mapbox GL JS is ~1.5 MB minified by design — the largest single
  // dep in the bundle by a wide margin. It's already code-split onto
  // a route-level dynamic import so prerendered free pages (/guide,
  // /privacy, /terms) ship none of it; only Mapbox-using components
  // pull the chunk on mount. The 500 kB default warning threshold
  // doesn't reflect that reality, so raise it to 1800 to acknowledge
  // the chunk and silence the false-positive build noise. Drop this
  // back if we ever swap Mapbox for MapLibre.
  vite: {
    build: {
      chunkSizeWarningLimit: 1800,
    },
  },

  // Ship client + server source maps so DevTools can resolve minified
  // stack traces to original source (useful for triaging real-user
  // error reports) and Lighthouse's `valid-source-maps` audit passes.
  // Nuxt's top-level `sourcemap` is the right knob — setting it via
  // `vite.build.sourcemap` was silently dropped on the client build.
  sourcemap: {
    client: true,
    server: true,
  },

  // Append a trailing slash to every internal <NuxtLink> href so links
  // point straight at the canonical URL (trailingSlash:true) instead of
  // 308-redirecting on every click/crawl. Matches site.trailingSlash +
  // the canonicalize() canonical/og URLs.
  experimental: {
    defaults: {
      nuxtLink: {
        trailingSlash: 'append',
        // Prefetch on hover/focus/tap intent instead of the default
        // on-visibility trigger. The landing page's always-in-viewport
        // links (BottomNav, BrandBar, home tiles) otherwise fire a burst
        // of route-chunk + _payload.json prefetches during initial load
        // — guide (37 kB MDC chunk), spots, pro, plus their payloads —
        // which contend for bandwidth against the critical path on slow
        // connections and inflate the simulated FCP/LCP. Intent-based
        // prefetch keeps navigation feeling instant (hover/tap still
        // warms the chunk) without taxing first paint. Tradeoff: list
        // pages like /spots no longer pre-warm detail chunks purely on
        // scroll — they warm on hover/tap, which is a wash on the fast
        // connections those pages are browsed on.
        prefetchOn: { visibility: false, interaction: true },
      },
    },
  },

  // @nuxtjs/supabase unconditionally registers a client plugin that pulls
  // ~190 KB of @supabase/* (auth-js, realtime, storage, postgrest, phoenix)
  // into the browser bundle on every page. Nothing client-side uses it —
  // there are zero useSupabaseClient()/useSupabaseUser() calls; all DB
  // access goes through server /api routes via serverSupabaseServiceRole.
  // Drop just the client plugin so supabase-js never reaches the browser.
  // The server plugin + server composables are left intact.
  hooks: {
    // Critical-CSS inlining for prerendered routes (/, /guide, /privacy,
    // /terms). beasties rewrites each prerendered HTML file: above-the-fold
    // rules are inlined into a <style> tag and the full entry stylesheet is
    // converted from a render-blocking <link rel="stylesheet"> into a
    // preload + onload swap (with a <noscript> fallback), which is what
    // turns Lighthouse's render-blocking audit green. pruneSource:false
    // keeps the full sheet intact and async-loaded, so even if critical
    // extraction misses a selector the page still ends fully styled — worst
    // case is a sub-frame flash, not broken layout. Build-time only: it
    // never runs on Vercel's serverless request path. SSR/ISR routes
    // (/spots, /pro) keep their blocking link by design — they have no
    // build-time HTML to process, and per-request beasties on serverless
    // isn't worth the file-resolution risk.
    async 'nitro:init'(nitro) {
      // Run AFTER the build is fully written to disk. During the
      // prerender phase the client CSS isn't in output.publicDir yet
      // (Nitro serves assets from memory and flushes them later), so a
      // prerender:generate hook can't resolve the stylesheets. The
      // `compiled` hook fires once everything — prerendered HTML and the
      // hashed _nuxt/*.css — is on disk, so beasties can read both.
      nitro.hooks.hook('compiled', async () => {
        const { readdir, readFile, writeFile } = await import('node:fs/promises')
        const { join } = await import('node:path')
        const publicDir = nitro.options.output.publicDir

        let htmlFiles: string[] = []
        try {
          const entries = await readdir(publicDir, { recursive: true, withFileTypes: true })
          htmlFiles = entries
            .filter(e => e.isFile() && e.name.endsWith('.html'))
            .map(e => join((e as any).parentPath ?? (e as any).path, e.name))
        } catch {
          return // no public dir (e.g. dev) — nothing to inline
        }
        if (!htmlFiles.length) return

        const { default: Beasties } = await import('beasties')
        let processed = 0
        for (const file of htmlFiles) {
          const html = await readFile(file, 'utf8')
          const beasties = new Beasties({
            path: publicDir,
            publicPath: '/',
            pruneSource: false, // keep the full sheet, async-loaded — no broken styling if extraction misses a rule
            preload: 'swap',    // blocking <link rel=stylesheet> → preload + onload swap + <noscript> fallback
            fonts: false,       // Google Fonts already load async via the head preload swap
            logLevel: 'warn',
          })
          try {
            await writeFile(file, await beasties.process(html))
            processed++
          } catch (err) {
            nitro.logger.warn(`[beasties] skipped ${file}:`, err)
          }
        }
        nitro.logger.info(`[beasties] inlined critical CSS for ${processed} prerendered route(s)`)
      })
    },

    'app:resolve'(app) {
      // Guard the count: if @nuxtjs/supabase ever renames this plugin file,
      // the filter would silently match nothing and quietly ship supabase-js
      // back into the client bundle. Warn loudly so the regression is caught
      // at build time instead of in a Lighthouse audit months later.
      const before = app.plugins.length
      app.plugins = app.plugins.filter(p => !p.src.includes('supabase.client'))
      if (app.plugins.length === before) {
        console.warn('[nuxt.config] @nuxtjs/supabase client plugin not found to strip — supabase-js may have returned to the client bundle (did the module rename supabase.client?).')
      }
    },
  },

  $development: {
    nitro: {
      storage: {
        'cache:nuxt': { driver: 'lruCache' },
      },
    },
  },

  runtimeConfig: {
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripeProPriceId: '',
    stripeReferralCouponId: '',
    resendApiKey: '',
    proJwtPrivateKey: '',
    adminSecret: '',
    // Build/deploy timestamp, baked at build time (nuxt.config evaluates in
    // Node during the build). Server-only. Used as the <lastmod> for dynamic
    // sitemap URLs that have no source file for autoLastmod to read — stable
    // within a deploy, refreshed on each redeploy. Overridable via
    // NUXT_BUILD_DATE if a deploy pipeline wants to pin the commit date.
    buildDate: new Date().toISOString(),
    public: {
      siteUrl: 'https://eclipsechase.is',
      mapboxToken: '',
      supabaseUrl: '',
      supabaseKey: '',
      umamiHost: '',
      umamiWebsiteId: '',
      // Pro gate dev bypass. Dev always bypasses by default; set
      // NUXT_PUBLIC_BYPASS_PRO_GATE=0 locally to test the real gate.
      // Prod never bypasses regardless.
      bypassProGate: '',
    },
  },
})
