<script setup lang="ts">
/**
 * Three share affordances for /check results: copy link, share to
 * Reddit, share to Twitter/X. Styled as pills matching the rest of
 * the site (mono caps, rounded-99, subtle border).
 */
import type { CheckResult } from '~/types/check'

const { t } = useI18n()
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
    return t('check.share_text_in_path_verdict', { verdict: v.toUpperCase() })
  }
  if (inPath) return t('check.share_text_in_path')
  return t('check.share_text_outside')
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
  <div class="share">
    <button type="button" class="share-pill" @click="copyLink">
      {{ copied ? t('check.share_copied') : t('check.share_copy') }}
    </button>
    <a :href="redditUrl" target="_blank" rel="noopener" class="share-pill">{{ t('check.share_reddit') }}</a>
    <a :href="twitterUrl" target="_blank" rel="noopener" class="share-pill">{{ t('check.share_twitter') }}</a>
  </div>
</template>

<style scoped>
.share {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.share-pill {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  padding: 7px 14px;
  border-radius: 99px;
  background: transparent;
  color: rgb(var(--ink-1) / 0.78);
  border: 1px solid rgb(var(--border-subtle) / 0.18);
  cursor: pointer;
  text-decoration: none;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}
.share-pill:hover {
  color: rgb(var(--accent));
  border-color: rgb(var(--accent) / 0.42);
  background: rgb(var(--accent) / 0.06);
}
.share-pill:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}
html.light .share-pill {
  color: rgb(var(--ink-1) / 0.85);
  border-color: rgb(var(--border-subtle) / 0.32);
  background: rgb(var(--ink-1) / 0.04);
}
</style>
