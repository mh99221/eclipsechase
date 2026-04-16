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
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: `${siteUrl}/guide` },
    { property: 'og:title', content: t('guide.title') },
    { property: 'og:description', content: t('guide.description') },
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
        'image': `${siteUrl}/__og-image__/image/guide/og.png`,
        'url': `${siteUrl}/guide`,
      }),
    },
  ],
}))
</script>

<template>
  <div class="relative noise min-h-screen pt-[72px]">
    <!-- Article -->
    <main class="pb-20">
      <article class="section-container max-w-3xl py-8 sm:py-16 guide-content">
        <ContentRenderer v-if="page" :value="page" />
      </article>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════
   Guide content — theme-aware (dark + Dawn Horizon light).
   All color values use semantic tokens from assets/css/main.css.
   ═══════════════════════════════════════════════════ */

.guide-content :deep(h1) {
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: rgb(var(--ink-1));
  margin-bottom: 0.5rem;
  letter-spacing: -0.01em;
}
@media (min-width: 640px) { .guide-content :deep(h1) { font-size: 2.5rem; } }
@media (min-width: 768px) { .guide-content :deep(h1) { font-size: 3rem; } }

.guide-content :deep(h1 + p) {
  color: rgb(var(--ink-3));
  font-size: 1rem;
  margin-bottom: 1.5rem;
}
@media (min-width: 640px) { .guide-content :deep(h1 + p) { font-size: 1.125rem; } }

.guide-content :deep(h2) {
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin-top: 3rem;
  margin-bottom: 1rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.5);
}
@media (min-width: 640px) { .guide-content :deep(h2) { font-size: 1.5rem; } }
.guide-content :deep(h2:first-of-type) { margin-top: 0; }

.guide-content :deep(h3) {
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

.guide-content :deep(p) {
  font-size: 0.9375rem;
  line-height: 1.8;
  color: rgb(var(--ink-2));
  margin-bottom: 1rem;
}
@media (min-width: 640px) { .guide-content :deep(p) { font-size: 1rem; } }

.guide-content :deep(a) {
  color: rgb(var(--accent));
  text-decoration: none;
  border-bottom: 1px solid rgb(var(--accent) / 0.3);
  transition: color 0.2s, border-color 0.2s;
}
.guide-content :deep(a:hover) {
  color: rgb(var(--accent-strong));
  border-bottom-color: rgb(var(--accent-strong));
}

.guide-content :deep(strong) {
  color: rgb(var(--ink-1));
  font-weight: 600;
}

.guide-content :deep(ul),
.guide-content :deep(ol) {
  font-size: 0.9375rem;
  line-height: 1.8;
  color: rgb(var(--ink-2));
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}
@media (min-width: 640px) {
  .guide-content :deep(ul),
  .guide-content :deep(ol) { font-size: 1rem; }
}
.guide-content :deep(ul) { list-style-type: disc; }
.guide-content :deep(ol) { list-style-type: decimal; }
.guide-content :deep(li) { margin-bottom: 0.375rem; }
.guide-content :deep(li::marker) { color: rgb(var(--accent) / 0.5); }

/* --- Tables --- */
.guide-content :deep(table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  background: rgb(var(--surface) / 0.6);
  border: 1px solid rgb(var(--border-subtle) / 0.6);
  border-radius: 6px;
  overflow: hidden;
}
.guide-content :deep(thead th) {
  text-align: left;
  padding: 0.75rem 1rem;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  color: rgb(var(--accent));
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  background: rgb(var(--surface-raised) / 0.9);
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.6);
}
.guide-content :deep(tbody td) {
  padding: 0.625rem 1rem;
  color: rgb(var(--ink-2));
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.35);
}
.guide-content :deep(tbody tr:last-child td) { border-bottom: none; }
.guide-content :deep(tbody tr:hover) { background: rgb(var(--accent) / 0.04); }

/* --- FAQ details/summary --- */
.guide-content :deep(details) {
  background: rgb(var(--surface) / 0.6);
  border: 1px solid rgb(var(--border-subtle) / 0.6);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  overflow: hidden;
  transition: border-color 0.2s;
}
.guide-content :deep(details:hover) { border-color: rgb(var(--border-subtle)); }

.guide-content :deep(summary) {
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgb(var(--ink-1));
  transition: background 0.2s;
  list-style: none;
}
.guide-content :deep(summary::-webkit-details-marker) { display: none; }
.guide-content :deep(summary::before) {
  content: '+';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.75rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  color: rgb(var(--accent));
  opacity: 0.7;
  border: 1px solid rgb(var(--accent) / 0.3);
  border-radius: 3px;
  transition: opacity 0.2s, transform 0.2s;
  flex-shrink: 0;
}
.guide-content :deep(details[open] summary::before) { content: '−'; opacity: 1; }
.guide-content :deep(summary:hover) { background: rgb(var(--accent) / 0.04); }
.guide-content :deep(details[open] summary) {
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.5);
}
.guide-content :deep(details > p),
.guide-content :deep(details > :not(summary)) { padding: 1rem 1.25rem; }

/* --- Inline code --- */
.guide-content :deep(code) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8125rem;
  background: rgb(var(--surface-raised) / 0.8);
  padding: 0.125rem 0.5rem;
  border-radius: 3px;
  color: rgb(var(--ink-2));
  border: 1px solid rgb(var(--border-subtle) / 0.5);
}

/* --- Horizontal rule --- */
.guide-content :deep(hr) {
  border: none;
  height: 1px;
  background: linear-gradient(to right, transparent, rgb(var(--border-subtle) / 0.7), transparent);
  margin: 3rem 0;
}

/* --- TOC (first ul) --- */
.guide-content :deep(> ul:first-of-type) {
  list-style: none;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
  background: rgb(var(--surface) / 0.6);
  border: 1px solid rgb(var(--border-subtle) / 0.6);
  border-radius: 6px;
}
.guide-content :deep(> ul:first-of-type li) { margin-bottom: 0.5rem; padding-left: 0; }
.guide-content :deep(> ul:first-of-type li::before) {
  content: '→';
  color: rgb(var(--accent) / 0.5);
  margin-right: 0.75rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
}
.guide-content :deep(> ul:first-of-type li::marker) { content: ''; }
.guide-content :deep(> ul:first-of-type a) {
  text-decoration: none;
  border-bottom: none;
  color: rgb(var(--ink-2));
  font-size: 0.9375rem;
  transition: color 0.2s;
}
.guide-content :deep(> ul:first-of-type a:hover) { color: rgb(var(--accent)); }
</style>
