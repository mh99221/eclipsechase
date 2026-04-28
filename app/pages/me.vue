<script setup lang="ts">
import Eyebrow from '~/components/ui/Eyebrow.vue'
import Card from '~/components/ui/Card.vue'

definePageMeta({ middleware: ['pro-gate'] })

useHead({ title: 'Me — EclipseChase' })

const { isPro } = useProStatus()
</script>

<template>
  <PageShell screen="me">
    <header class="me-header">
      <Eyebrow tone="accent">● ACCOUNT</Eyebrow>
      <h1 class="me-title">Me</h1>
    </header>

    <div class="me-body">
      <Card>
        <div class="me-row">
          <div class="me-row-label">Pro status</div>
          <div class="me-row-value" :data-pro="isPro">
            {{ isPro ? 'Active' : 'Free tier' }}
          </div>
        </div>
      </Card>

      <ClientOnly>
        <RestorePurchase v-if="!isPro" />
      </ClientOnly>
    </div>
  </PageShell>
</template>

<style scoped>
.me-header {
  padding: 24px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.me-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  letter-spacing: -0.018em;
  line-height: 1.1;
  margin: 0;
}
.me-body {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.me-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.me-row-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
}
.me-row-value {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--ink-1) / 0.62);
}
.me-row-value[data-pro='true'] {
  color: rgb(var(--good));
}

@media (min-width: 768px) {
  .me-header { padding: 48px 24px 24px; gap: 10px; }
  .me-title  { font-size: 36px; }
  .me-body   { padding: 0 24px; }
}
</style>
