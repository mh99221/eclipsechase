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

    <!-- Footer -->
    <footer class="border-t border-void-border/30 py-8">
      <div class="section-container flex items-center justify-between">
        <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; {{ t('nav.back_home') }}
        </NuxtLink>
        <div class="flex gap-4">
          <NuxtLink to="/privacy" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {{ t('footer.privacy') }}
          </NuxtLink>
          <NuxtLink to="/terms" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {{ t('footer.terms') }}
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════
   Guide content — matches /spots design system:
   - Manrope for headings (font-display)
   - Default body font for prose (not monospace)
   - Mono only for labels, metadata, code
   - Cards use bg-void-surface + border-void-border/40
   ═══════════════════════════════════════════════════ */

/* --- Main heading (rendered from # in markdown) --- */
.guide-content :deep(h1) {
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.5rem;
  letter-spacing: -0.01em;
}

@media (min-width: 640px) {
  .guide-content :deep(h1) {
    font-size: 2.5rem;
  }
}

@media (min-width: 768px) {
  .guide-content :deep(h1) {
    font-size: 3rem;
  }
}

/* Subtitle — first paragraph after h1 */
.guide-content :deep(h1 + p) {
  color: #94a3b8;
  font-size: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 640px) {
  .guide-content :deep(h1 + p) {
    font-size: 1.125rem;
  }
}

/* --- Section headings --- */
.guide-content :deep(h2) {
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  margin-top: 3rem;
  margin-bottom: 1rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid rgba(26, 37, 64, 0.5);
}

@media (min-width: 640px) {
  .guide-content :deep(h2) {
    font-size: 1.5rem;
  }
}

.guide-content :deep(h2:first-of-type) {
  margin-top: 0;
}

.guide-content :deep(h3) {
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

/* --- Body text — use default Manrope, NOT monospace --- */
.guide-content :deep(p) {
  font-size: 0.9375rem;
  line-height: 1.8;
  color: #94a3b8;
  margin-bottom: 1rem;
}

@media (min-width: 640px) {
  .guide-content :deep(p) {
    font-size: 1rem;
  }
}

/* --- Links --- */
.guide-content :deep(a) {
  color: var(--corona);
  text-decoration: none;
  border-bottom: 1px solid rgba(245, 158, 11, 0.3);
  transition: color 0.2s, border-color 0.2s;
}

.guide-content :deep(a:hover) {
  color: var(--corona-bright);
  border-bottom-color: var(--corona-bright);
}

.guide-content :deep(strong) {
  color: #e2e8f0;
  font-weight: 600;
}

/* --- Lists --- */
.guide-content :deep(ul),
.guide-content :deep(ol) {
  font-size: 0.9375rem;
  line-height: 1.8;
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
  margin-bottom: 0.375rem;
}

.guide-content :deep(li::marker) {
  color: rgba(245, 158, 11, 0.4);
}

/* --- Tables — card style matching /spots stat cards --- */
.guide-content :deep(table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  background: rgba(10, 16, 32, 0.5);
  border: 1px solid rgba(26, 37, 64, 0.4);
  border-radius: 6px;
  overflow: hidden;
}

.guide-content :deep(thead th) {
  text-align: left;
  padding: 0.75rem 1rem;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  color: var(--corona);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  background: rgba(10, 16, 32, 0.8);
  border-bottom: 1px solid rgba(26, 37, 64, 0.5);
}

.guide-content :deep(tbody td) {
  padding: 0.625rem 1rem;
  color: #94a3b8;
  border-bottom: 1px solid rgba(26, 37, 64, 0.25);
}

.guide-content :deep(tbody tr:last-child td) {
  border-bottom: none;
}

.guide-content :deep(tbody tr:hover) {
  background: rgba(245, 158, 11, 0.03);
}

/* --- FAQ details/summary — card style --- */
.guide-content :deep(details) {
  background: rgba(10, 16, 32, 0.5);
  border: 1px solid rgba(26, 37, 64, 0.4);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  overflow: hidden;
  transition: border-color 0.2s;
}

.guide-content :deep(details:hover) {
  border-color: rgba(26, 37, 64, 0.7);
}

.guide-content :deep(summary) {
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  transition: background 0.2s;
  list-style: none;
}

.guide-content :deep(summary::-webkit-details-marker) {
  display: none;
}

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
  color: var(--corona);
  opacity: 0.6;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 3px;
  transition: opacity 0.2s, transform 0.2s;
  flex-shrink: 0;
}

.guide-content :deep(details[open] summary::before) {
  content: '−';
  opacity: 1;
}

.guide-content :deep(summary:hover) {
  background: rgba(245, 158, 11, 0.03);
}

.guide-content :deep(details[open] summary) {
  border-bottom: 1px solid rgba(26, 37, 64, 0.4);
}

.guide-content :deep(details > p),
.guide-content :deep(details > :not(summary)) {
  padding: 1rem 1.25rem;
}

/* --- Inline code — mono badge style --- */
.guide-content :deep(code) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8125rem;
  background: rgba(10, 16, 32, 0.6);
  padding: 0.125rem 0.5rem;
  border-radius: 3px;
  color: #cbd5e1;
  border: 1px solid rgba(26, 37, 64, 0.3);
}

/* --- Horizontal rule --- */
.guide-content :deep(hr) {
  border: none;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(26, 37, 64, 0.6), transparent);
  margin: 3rem 0;
}

/* --- TOC — styled as a proper nav card --- */
.guide-content :deep(> ul:first-of-type) {
  list-style: none;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
  background: rgba(10, 16, 32, 0.5);
  border: 1px solid rgba(26, 37, 64, 0.4);
  border-radius: 6px;
}

.guide-content :deep(> ul:first-of-type li) {
  margin-bottom: 0.5rem;
  padding-left: 0;
}

.guide-content :deep(> ul:first-of-type li::before) {
  content: '→';
  color: rgba(245, 158, 11, 0.4);
  margin-right: 0.75rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
}

.guide-content :deep(> ul:first-of-type li::marker) {
  content: '';
}

.guide-content :deep(> ul:first-of-type a) {
  text-decoration: none;
  border-bottom: none;
  color: #94a3b8;
  font-size: 0.9375rem;
  transition: color 0.2s;
}

.guide-content :deep(> ul:first-of-type a:hover) {
  color: var(--corona);
}
</style>
