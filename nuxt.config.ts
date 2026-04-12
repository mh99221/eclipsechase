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
  ],

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
    '/guide': { prerender: true },
    '/pro': { ssr: true },
    '/privacy': { prerender: true },
    '/terms': { prerender: true },
    '/spots/**': { isr: 3600 },
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
