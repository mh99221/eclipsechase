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
  ],

  colorMode: {
    preference: 'dark',      // fallback when user has no system / stored preference
    fallback: 'dark',        // SSR fallback — keeps the brand canonical
    classSuffix: '',         // so html gets `dark` or `light` (no `-mode` suffix)
    storageKey: 'ec-color-mode',
  },

  site: {
    url: 'https://eclipsechase.is',
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
        { rel: 'preload', as: 'style', href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap', onload: "this.onload=null;this.rel='stylesheet'" },
        { rel: 'preload', as: 'style', href: 'https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.css', onload: "this.onload=null;this.rel='stylesheet'" },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'is', name: 'Íslenska', file: 'is.json' },
    ],
    defaultLocale: 'en',
    lazy: true,
    langDir: '../i18n',
    strategy: 'prefix_except_default',
  },

  supabase: {
    redirect: false,
  },

  routeRules: {
    // Pages
    '/guide': { prerender: true },
    '/pro': { ssr: true },
    '/privacy': { prerender: true },
    '/terms': { prerender: true },
    '/spots': {
      ssr: true,
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    },
    '/spots/**': { isr: 3600 },

    // API — cached at the Vercel edge so most map page loads don't hit
    // our serverless functions or Supabase at all. stale-while-revalidate
    // lets us serve instantly while a fresh copy is fetched in the
    // background. Tune these if data freshness starts to matter.
    '/api/weather/stations': {
      // Essentially immutable — stations are seeded + rarely change.
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    },
    '/api/weather/cloud-cover': {
      // Upstream cron refreshes every 15 min. 2-min edge cache with SWR
      // keeps the map feeling live without hammering the function.
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    },
    '/api/weather/forecast-timeline': {
      // Same cadence as cloud-cover — hourly timeline used by the map.
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    },
    '/api/spots': {
      // Data changes rarely (manual SQL edits). Long SWR so re-renders
      // feel instant but a fresh version eventually propagates.
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    },
  },

  nitro: {
    serverAssets: [
      { baseName: 'dem', dir: './server/data/dem' },
      { baseName: 'eclipse-data', dir: './public/eclipse-data' },
    ],
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
    resendApiKey: '',
    proJwtPrivateKey: '',
    adminSecret: '',
    public: {
      siteUrl: 'https://eclipsechase.is',
      mapboxToken: '',
      supabaseUrl: '',
      supabaseKey: '',
      umamiHost: '',
      umamiWebsiteId: '',
    },
  },
})
