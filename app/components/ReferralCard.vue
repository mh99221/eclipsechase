<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import CardTitle from '~/components/ui/CardTitle.vue'

const { t } = useI18n()
const { authHeaders } = useProStatus()

interface ReferralInfo {
  code: string
  link: string
  joined_count: number
  earned_eur: number
  pending_count: number
}

const info = ref<ReferralInfo | null>(null)
const loading = ref(true)
const copied = ref(false)

onMounted(async () => {
  try {
    info.value = await $fetch<ReferralInfo>('/api/referral/me', {
      method: 'POST',
      headers: await authHeaders(),
    })
  } catch {
    info.value = null
  } finally {
    loading.value = false
  }
})

async function copyLink() {
  if (!info.value) return
  try {
    if (navigator.share) {
      await navigator.share({ url: info.value.link, title: 'EclipseChase Pro' })
      return
    }
    await navigator.clipboard.writeText(info.value.link)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* user cancelled share / clipboard blocked */ }
}

const joinedLabel = computed(() => {
  if (!info.value) return ''
  const n = info.value.joined_count
  return t(n === 1 ? 'referral.tally_joined' : 'referral.tally_joined_plural', { count: n })
})
</script>

<template>
  <Card v-if="loading || info">
    <CardTitle>{{ t('referral.card_title') }}</CardTitle>
    <p v-if="loading" class="rc-loading">{{ t('referral.loading') }}</p>
    <template v-else-if="info">
      <p class="rc-explainer">{{ t('referral.explainer') }}</p>
      <div class="rc-link-row">
        <code class="rc-link">{{ info.link }}</code>
        <button class="rc-copy" type="button" @click="copyLink">
          {{ copied ? t('referral.copied') : t('referral.copy') }}
        </button>
      </div>
      <div v-if="info.joined_count > 0" class="rc-tally">
        <span>{{ joinedLabel }}</span>
        <span class="rc-earned">{{ t('referral.tally_earned', { amount: info.earned_eur }) }}</span>
      </div>
      <p v-if="info.pending_count > 0" class="rc-pending">{{ t('referral.reward_pending') }}</p>
    </template>
  </Card>
</template>

<style scoped>
.rc-explainer { font-family: 'Inter Tight', system-ui, sans-serif; font-size: 13px; line-height: 1.5; color: rgb(var(--ink-1) / 0.72); margin: 8px 0 14px; }
.rc-loading { font-family: 'Inter Tight', system-ui, sans-serif; font-size: 13px; color: rgb(var(--ink-1) / 0.5); }
.rc-link-row { display: flex; gap: 8px; align-items: center; }
.rc-link { flex: 1; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; color: rgb(var(--ink-1) / 0.8); background: rgb(var(--bg)); border: 1px solid rgb(var(--border-subtle) / 0.4); border-radius: 6px; padding: 8px 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-copy { flex-shrink: 0; background: rgb(var(--accent)); color: rgb(var(--accent-ink)); border: 0; border-radius: 6px; padding: 8px 12px; font-family: 'Inter Tight', system-ui, sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; }
.rc-copy:hover { background: rgb(var(--accent-strong)); }
.rc-tally { display: flex; justify-content: space-between; margin-top: 14px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.08em; color: rgb(var(--ink-1) / 0.62); }
.rc-earned { color: rgb(var(--good)); }
.rc-pending { margin-top: 10px; font-family: 'Inter Tight', system-ui, sans-serif; font-size: 12px; color: rgb(var(--warn)); }
</style>
