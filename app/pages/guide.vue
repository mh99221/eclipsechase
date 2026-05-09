<script setup lang="ts">
const { t } = useI18n()
const siteUrl = useRuntimeConfig().public.siteUrl as string

const { data: page, refresh: refreshPage } = await useAsyncData('guide', () =>
  queryCollection('content').path('/guide').first(),
)

// Nuxt Content v3's client-side `queryCollection` occasionally returns
// null on SPA navigation to this prerendered page (the `_payload.json`
// or the `/api/_content/query/*` lookup races / loses to the SW).
// When that happens the article body silently disappears and only the
// header + hard-coded TOC chips render. F5 fixes it because the
// prerendered HTML inlines the data. As a defensive net, re-trigger
// the fetch on the client when we mount with no content; for the
// happy path this is a no-op since `page.value` is already set.
if (import.meta.client) {
  onMounted(() => {
    if (!page.value) refreshPage()
  })
}

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

// TOC chip strip — labels match the H2s in content/guide.md.
const toc = [
  { id: 'whats-happening',     label: "What's happening" },
  { id: 'the-path-of-totality', label: 'Path of totality' },
  { id: 'best-viewing-spots',  label: 'Best spots' },
  { id: 'weather-cloud-cover', label: 'Weather' },
  { id: 'getting-there',       label: 'Getting there' },
  { id: 'what-to-bring',       label: 'What to bring' },
  { id: 'eclipse-day-timeline', label: 'Day timeline' },
  { id: 'faq',                 label: 'FAQ' },
] as const

function scrollTo(id: string) {
  if (!import.meta.client) return
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <PageShell screen="guide">
    <header class="guide-header">
      <Eyebrow tone="accent">GUIDE · 2026.08.12</Eyebrow>
      <h1 class="guide-title">Complete Guide to the 2026 Total Solar Eclipse in Iceland</h1>
      <p class="guide-sub">Your practical planning reference — the only total solar eclipse to cross Iceland for the next 170 years.</p>
    </header>

    <nav class="guide-toc" aria-label="Sections">
      <Pill
        v-for="entry in toc"
        :key="entry.id"
        size="sm"
        :active="false"
        @click="scrollTo(entry.id)"
      >{{ entry.label }}</Pill>
    </nav>

    <article class="guide-content">
      <ContentRenderer v-if="page" :value="page" />
    </article>
  </PageShell>
</template>

<style scoped>
.guide-header {
  padding: 24px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
@media (min-width: 768px) {
  .guide-header { padding: 48px 24px 24px; gap: 14px; }
}
.guide-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
}
@media (min-width: 640px) { .guide-title { font-size: 36px; } }
.guide-sub {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  color: rgb(var(--ink-1) / 0.62);
  line-height: 1.55;
  margin: 0;
}

.guide-toc {
  display: flex;
  gap: 6px;
  padding: 0 16px 14px;
  overflow-x: auto;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  scrollbar-width: none;
}
@media (min-width: 768px) {
  /* Inset the row + its bottom rule by 24px to match the page gutter. */
  .guide-toc {
    margin: 0 24px;
    padding: 0 0 18px;
    gap: 8px;
    flex-wrap: wrap;
    overflow-x: visible;
  }
}
.guide-toc::-webkit-scrollbar { display: none; }

.guide-content {
  padding: 16px 16px 32px;
}

/* ═══════════════════════════════════════════════════
   Markdown content — v0 typography pass.
   Inter Tight body, JetBrains Mono labels/code/eyebrows.
   All colors via semantic tokens for theme-awareness.
   ═══════════════════════════════════════════════════ */

.guide-content :deep(h1) {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  margin-bottom: 8px;
  letter-spacing: -0.02em;
  /* The article H1 duplicates the page header above; hide it. */
  display: none;
}

.guide-content :deep(h1 + p) {
  color: rgb(var(--ink-1) / 0.62);
  font-size: 15px;
  margin-bottom: 18px;
  display: none;
}

.guide-content :deep(h2) {
  /* TOC chips use scrollIntoView() — without this offset the H2 lands
     under the fixed BrandBar (60px + safe-area + 14px). Match the
     PageShell top-padding calc + a 24px breathing buffer. */
  scroll-margin-top: calc(60px + max(env(safe-area-inset-top), 14px) + 24px);
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 19px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  margin-top: 36px;
  margin-bottom: 12px;
  /* Replace bottom border (read as a link underline) with a left
     accent rail — clearly a section heading, not a hyperlink. */
  padding-bottom: 0;
  padding-left: 12px;
  border-left: 3px solid rgb(var(--accent));
  border-bottom: 0;
  letter-spacing: -0.005em;
}
.guide-content :deep(h2:first-of-type) { margin-top: 0; }

.guide-content :deep(h3) {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin-top: 24px;
  margin-bottom: 10px;
}

.guide-content :deep(p) {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: rgb(var(--ink-1) / 0.85);
  margin-bottom: 14px;
}

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
  font-weight: 700;
}

.guide-content :deep(ul),
.guide-content :deep(ol) {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: rgb(var(--ink-1) / 0.85);
  margin-bottom: 14px;
  padding-left: 22px;
}
.guide-content :deep(ul) { list-style-type: disc; }
.guide-content :deep(ol) { list-style-type: decimal; }
.guide-content :deep(li) { margin-bottom: 5px; }
.guide-content :deep(li::marker) { color: rgb(var(--accent) / 0.5); }

/* Tables — v0 mono-caps headers + olive accent on key columns */
.guide-content :deep(table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 14px 0 18px;
  font-size: 13px;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 8px;
  overflow: hidden;
}
.guide-content :deep(thead th) {
  text-align: left;
  padding: 10px 14px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 500;
  color: rgb(var(--ink-1) / 0.62);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
}
.guide-content :deep(tbody td) {
  padding: 9px 14px;
  color: rgb(var(--ink-1));
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.06);
  font-variant-numeric: tabular-nums;
}
.guide-content :deep(tbody tr:last-child td) { border-bottom: none; }

/* FAQ details/summary */
.guide-content :deep(details) {
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 8px;
  margin-bottom: 6px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.guide-content :deep(summary) {
  padding: 13px 16px;
  cursor: pointer;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  list-style: none;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
}
.guide-content :deep(summary::-webkit-details-marker) { display: none; }
.guide-content :deep(summary::before) {
  content: '+';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 14px;
  color: rgb(var(--accent));
  opacity: 0.7;
  border: 1px solid rgb(var(--accent) / 0.3);
  border-radius: 3px;
  flex-shrink: 0;
  transition: opacity 0.2s;
}
.guide-content :deep(details[open] summary::before) { content: '−'; opacity: 1; }
.guide-content :deep(summary:hover) { background: rgb(var(--accent) / 0.04); }
.guide-content :deep(details[open] summary) {
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
}
.guide-content :deep(details > p),
.guide-content :deep(details > :not(summary)) { padding: 14px 16px; }

/* Inline code */
.guide-content :deep(code) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12.5px;
  background: rgb(var(--surface-solid));
  padding: 2px 6px;
  border-radius: 3px;
  color: rgb(var(--ink-1));
  border: 1px solid rgb(var(--border-subtle) / 0.08);
}

/* Horizontal rule */
.guide-content :deep(hr) {
  border: none;
  height: 1px;
  background: linear-gradient(to right, transparent, rgb(var(--border-subtle) / 0.16), transparent);
  margin: 36px 0;
}

/* Desktop overrides for the markdown content — placed after the base
   :deep rules so cascade favors them at viewports ≥ 768px. */
@media (min-width: 768px) {
  .guide-content { padding: 24px 24px 48px; }
  .guide-content :deep(h2) { font-size: 22px; margin-top: 48px; }
  .guide-content :deep(p),
  .guide-content :deep(ul),
  .guide-content :deep(ol) { font-size: 15px; line-height: 1.7; }
}
</style>
