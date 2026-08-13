<script setup lang="ts">
/**
 * Closing note for the archive. Reached from the retired /pro redirect and
 * linked from the landing hero. Deliberately indexable — it is the honest
 * answer to anyone who arrives late looking for a live eclipse tool.
 */
useHead({
  title: 'Thank you for chasing it with us',
  meta: [
    {
      name: 'description',
      content:
        'The August 12, 2026 total solar eclipse has passed. EclipseChase.is is now a permanent archive of the guide, the viewing spots, and the horizon data.',
    },
    { name: 'robots', content: 'index, follow' },
  ],
})
</script>

<template>
  <PageShell screen="farewell" width="reading">
    <article class="farewell-body">
      <Eyebrow tone="dim" class="mb-3">August 12, 2026</Eyebrow>

      <h1 class="font-display text-3xl sm:text-4xl font-bold text-ink-1 mb-8 leading-tight">
        It&rsquo;s over. Thank you for chasing it with us.
      </h1>

      <div class="space-y-5 text-base text-ink-2 leading-relaxed">
        <p>
          The Moon&rsquo;s shadow came ashore in the Westfjords and swept southeast across
          Snæfellsnes and Reykjanes between <strong class="text-ink-1">17:43 and 17:48 UTC</strong>
          on August 12, 2026. Wherever you stood &mdash; a lighthouse headland, a gravel pull-off,
          a hillside you picked off a map three months earlier &mdash; you had about two minutes.
          We hope the sky gave them to you.
        </p>
        <p>
          The live parts of this site are switched off. The weather map, the hourly forecasts,
          the road cameras and the recommendation engine all existed to answer one question,
          and that question no longer has a future tense. There is nothing left to predict.
        </p>
        <p>
          What remains is the record. The <NuxtLinkLocale to="/guide" class="farewell-link">guide</NuxtLinkLocale>
          still explains how totality works and how to read an Icelandic sky. The
          <NuxtLinkLocale to="/spots" class="farewell-link">viewing spots</NuxtLinkLocale> keep their
          descriptions, photos, contact times and terrain notes exactly as they stood on eclipse
          morning. The <NuxtLinkLocale to="/check" class="farewell-link">horizon check</NuxtLinkLocale>
          still runs against the ÍslandsDEM terrain model, because that data does not expire and
          somebody planning a different sunrise may still want it.
        </p>
      </div>

      <Card class="mt-10">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-1.5">
          Next total eclipse over Iceland
        </p>
        <p class="font-display text-3xl font-bold text-ink-1">2196</p>
        <p class="text-sm text-ink-2 leading-relaxed mt-3">
          A hundred and seventy years away. The next one anywhere is closer:
          <strong class="text-ink-1">August 2, 2027</strong>, crossing southern Spain, Morocco and
          Egypt &mdash; over six minutes of totality near Luxor, in some of the most reliably
          cloudless air on the planet. If yesterday caught you, start there.
        </p>
      </Card>
    </article>
  </PageShell>
</template>

<style scoped>
.farewell-body {
  padding: 8px 16px 32px;
}
@media (min-width: 768px) {
  .farewell-body { padding: 8px 24px 40px; }
}
.farewell-link {
  color: rgb(var(--accent));
  text-decoration: none;
  border-bottom: 1px solid rgb(var(--accent) / 0.35);
  transition: color 0.2s, border-color 0.2s;
}
.farewell-link:hover {
  color: rgb(var(--accent-strong));
  border-bottom-color: rgb(var(--accent-strong) / 0.6);
}
</style>
