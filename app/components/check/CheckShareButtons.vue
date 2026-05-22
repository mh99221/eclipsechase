<script setup lang="ts">
/**
 * Three share affordances for /check results: copy link, share to
 * Reddit, share to Twitter/X. Each builds a pre-populated URL so the
 * shared destination already knows what was checked.
 */
import type { CheckResult } from '~/types/check'

const props = defineProps<{ result: CheckResult }>()
const config = useRuntimeConfig()
const siteUrl = (config.public.siteUrl as string) || 'https://eclipsechase.is'

const shareUrl = computed(() => {
  const lat = props.result.input.lat.toFixed(5)
  const lng = props.result.input.lng.toFixed(5)
  return `${siteUrl}/check?lat=${lat}&lng=${lng}`
})

const shareText = computed(() => {
  const v = props.result.horizon.verdict
  const inPath = props.result.totality.insidePath
  if (inPath && v !== 'unknown') {
    return `I checked my Iceland eclipse spot — ${v.toUpperCase()} sky verdict.`
  }
  if (inPath) {
    return `I checked my Iceland eclipse spot — inside the path of totality on Aug 12, 2026.`
  }
  return `I checked an Iceland eclipse spot for Aug 12, 2026.`
})

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // clipboard blocked — surface the URL inline as a fallback
    window.prompt('Copy this link:', shareUrl.value)
  }
}

const redditUrl = computed(() =>
  `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl.value)}`
  + `&title=${encodeURIComponent(shareText.value)}`,
)

const twitterUrl = computed(() =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.value + ' ' + shareUrl.value)}`,
)
</script>

<template>
  <section>
    <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-3">
      Share this check
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="font-mono text-xs tracking-wider px-3 py-2 rounded border border-border-subtle/60 text-ink-2 hover:text-ink-1 hover:border-accent/40 transition-colors"
        @click="copyLink"
      >
        {{ copied ? '✓ Copied' : 'Copy link' }}
      </button>
      <a
        :href="redditUrl"
        target="_blank"
        rel="noopener"
        class="font-mono text-xs tracking-wider px-3 py-2 rounded border border-border-subtle/60 text-ink-2 hover:text-ink-1 hover:border-accent/40 transition-colors"
      >
        Reddit
      </a>
      <a
        :href="twitterUrl"
        target="_blank"
        rel="noopener"
        class="font-mono text-xs tracking-wider px-3 py-2 rounded border border-border-subtle/60 text-ink-2 hover:text-ink-1 hover:border-accent/40 transition-colors"
      >
        Twitter / X
      </a>
    </div>
  </section>
</template>
