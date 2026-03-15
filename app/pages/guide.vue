<script setup lang="ts">
const { t } = useI18n()
const siteUrl = useRuntimeConfig().public.siteUrl as string

const { data: page } = await useAsyncData('guide', () =>
  queryCollection('content').path('/guide').first(),
)

useHead(() => ({
  title: t('guide.title'),
  meta: [
    { name: 'description', content: t('guide.description') },
    // Open Graph overrides for article type
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: `${siteUrl}/guide` },
    { property: 'og:title', content: t('guide.title') },
    { property: 'og:description', content: t('guide.description') },
    { property: 'og:image', content: `${siteUrl}/og-image.jpg` },
  ],
  link: [
    { rel: 'canonical', href: `${siteUrl}/guide` },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': t('guide.title'),
        'datePublished': '2026-03-15',
        'author': { '@type': 'Organization', 'name': 'EclipseChase.is', 'url': siteUrl },
        'publisher': { '@type': 'Organization', 'name': 'EclipseChase.is' },
        'description': t('guide.description'),
        'image': `${siteUrl}/og-image.jpg`,
        'url': `${siteUrl}/guide`,
      }),
    },
  ],
}))
</script>

<template>
  <div class="min-h-screen bg-void text-slate-300">
    <!-- Nav -->
    <nav class="fixed top-0 inset-x-0 z-50 border-b border-void-border bg-void/80 backdrop-blur-md">
      <div class="section-container flex items-center justify-between h-14">
        <NuxtLink to="/" class="font-display font-bold text-white tracking-tight text-lg">
          EclipseChase<span class="text-corona">.is</span>
        </NuxtLink>
        <NuxtLink
          to="/map"
          class="font-mono text-xs tracking-widest uppercase text-slate-400 hover:text-corona transition-colors"
        >
          Map
        </NuxtLink>
      </div>
    </nav>

    <!-- Article -->
    <main class="pt-24 pb-20">
      <article class="section-container max-w-2xl guide-content">
        <ContentRenderer v-if="page" :value="page" />
      </article>
    </main>

    <!-- Footer -->
    <footer class="border-t border-void-border py-12">
      <div class="section-container max-w-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 font-mono">
        <div class="flex gap-6">
          <NuxtLink to="/map" class="hover:text-corona transition-colors">
            Map
          </NuxtLink>
          <NuxtLink to="/recommend" class="hover:text-corona transition-colors">
            Find Your Spot
          </NuxtLink>
          <NuxtLink to="/" class="hover:text-corona transition-colors">
            Home
          </NuxtLink>
        </div>
        <span class="text-slate-600">
          EclipseChase.is
        </span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* --- Markdown content styles via :deep() --- */

.guide-content :deep(h2) {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-top: 3rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(26, 37, 64, 0.6);
}

.guide-content :deep(h2:first-of-type) {
  margin-top: 0;
}

.guide-content :deep(h3) {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: #cbd5e1;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

.guide-content :deep(p) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.75;
  color: #94a3b8;
  margin-bottom: 1rem;
}

@media (min-width: 640px) {
  .guide-content :deep(p) {
    font-size: 1rem;
  }
}

.guide-content :deep(a) {
  color: #f59e0b;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s;
}

.guide-content :deep(a:hover) {
  color: #fbbf24;
}

.guide-content :deep(strong) {
  color: #e2e8f0;
  font-weight: 600;
}

.guide-content :deep(ul),
.guide-content :deep(ol) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.75;
  color: #94a3b8;
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

@media (min-width: 640px) {
  .guide-content :deep(ul),
  .guide-content :deep(ol) {
    font-size: 1rem;
  }
}

.guide-content :deep(ul) {
  list-style-type: disc;
}

.guide-content :deep(ol) {
  list-style-type: decimal;
}

.guide-content :deep(li) {
  margin-bottom: 0.25rem;
}

.guide-content :deep(li::marker) {
  color: #475569;
}

/* Table styling */
.guide-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8125rem;
}

.guide-content :deep(thead th) {
  text-align: left;
  padding: 0.625rem 0.75rem;
  font-weight: 600;
  color: #f59e0b;
  border-bottom: 1px solid #1a2540;
  background: rgba(10, 16, 32, 0.6);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.guide-content :deep(tbody td) {
  padding: 0.5rem 0.75rem;
  color: #94a3b8;
  border-bottom: 1px solid rgba(26, 37, 64, 0.4);
}

.guide-content :deep(tbody tr:hover) {
  background: rgba(10, 16, 32, 0.4);
}

/* FAQ details/summary styling */
.guide-content :deep(details) {
  background: rgba(10, 16, 32, 0.5);
  border: 1px solid #1a2540;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.guide-content :deep(summary) {
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  color: #f59e0b;
  font-weight: 500;
  transition: background 0.2s;
}

.guide-content :deep(summary:hover) {
  background: rgba(245, 158, 11, 0.05);
}

.guide-content :deep(details[open] summary) {
  border-bottom: 1px solid #1a2540;
}

.guide-content :deep(details > p),
.guide-content :deep(details > :not(summary)) {
  padding: 0.75rem 1rem;
}

/* Inline code */
.guide-content :deep(code) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8125rem;
  background: rgba(10, 16, 32, 0.6);
  padding: 0.125rem 0.375rem;
  border-radius: 2px;
  color: #cbd5e1;
}

/* Horizontal rule */
.guide-content :deep(hr) {
  border: none;
  height: 1px;
  background: linear-gradient(to right, transparent, #1a2540, transparent);
  margin: 2.5rem 0;
}

/* TOC list at top (first ul) — style as nav links */
.guide-content :deep(> ul:first-of-type) {
  list-style: none;
  padding-left: 0;
  border: 1px solid #1a2540;
  border-radius: 4px;
  padding: 1rem 1.25rem;
  background: rgba(10, 16, 32, 0.4);
}

.guide-content :deep(> ul:first-of-type li) {
  margin-bottom: 0.375rem;
}

.guide-content :deep(> ul:first-of-type a) {
  text-decoration: none;
  color: #94a3b8;
}

.guide-content :deep(> ul:first-of-type a:hover) {
  color: #f59e0b;
}
</style>
