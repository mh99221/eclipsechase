// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxtjs/supabase',
    '@nuxt/content',
  ],

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
        { property: 'og:image', content: 'https://eclipsechase.is/og-image.jpg' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://eclipsechase.is' },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'EclipseChase.is — Find Clear Skies on Eclipse Day' },
        { name: 'twitter:description', content: 'Real-time weather tracking for the August 12, 2026 total solar eclipse in Iceland.' },
        { name: 'twitter:image', content: 'https://eclipsechase.is/og-image.jpg' },
      ],
      script: [
        ...(process.env.NUXT_PUBLIC_UMAMI_WEBSITE_ID
          ? [{
            src: `${process.env.NUXT_PUBLIC_UMAMI_HOST || 'https://cloud.umami.is'}/script.js`,
            async: true,
            'data-website-id': process.env.NUXT_PUBLIC_UMAMI_WEBSITE_ID,
          }]
          : []),
      ],
      link: [
        { rel: 'canonical', href: 'https://eclipsechase.is' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap' },
      ],
    },
  },

  css: ['~/assets/css/main.css', 'mapbox-gl/dist/mapbox-gl.css'],

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

  runtimeConfig: {
    stripeSecretKey: '',
    stripeWebhookSecret: '',
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
