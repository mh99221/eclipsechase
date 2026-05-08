<script setup lang="ts">
const props = defineProps<{ compact?: boolean }>()
const { t } = useI18n()
const email = ref('')
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function handleSubmit() {
  if (!email.value || status.value === 'loading') return

  status.value = 'loading'
  errorMessage.value = ''

  try {
    await $fetch('/api/signup', {
      method: 'POST',
      body: { email: email.value },
    })
    status.value = 'success'
    email.value = ''
  } catch (err: any) {
    status.value = 'error'
    errorMessage.value = err?.data?.statusMessage || t('signup.error')
  }
}
</script>

<template>
  <div class="email-signup w-full" :class="props.compact ? 'is-compact' : 'max-w-lg mx-auto'">
    <!-- Success state -->
    <div
      v-if="status === 'success'"
      class="text-center animate-fade-in"
    >
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full border border-green-500/20 mb-4">
        <svg class="w-8 h-8 text-status-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-status-green font-display font-medium text-lg">
        {{ t('signup.success') }}
      </p>
    </div>

    <!-- Form -->
    <form
      v-else
      class="relative"
      @submit.prevent="handleSubmit"
    >
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <input
            v-model="email"
            type="email"
            required
            aria-label="Email address"
            :placeholder="t('signup.placeholder')"
            :disabled="status === 'loading'"
            class="w-full px-5 py-4 bg-surface-raised/40 border border-border-subtle/40
                   text-ink-1 placeholder:text-ink-3 font-display text-base tracking-wide
                   focus:outline-none focus:border-accent/40 focus:shadow-[0_0_20px_rgb(var(--accent)/0.12)]
                   disabled:opacity-50 transition-all duration-300"
            style="border-radius: 2px;"
          >
        </div>
        <button
          type="submit"
          :disabled="status === 'loading'"
          class="btn-corona disabled:opacity-50 group"
        >
          <span class="flex items-center gap-2">
            <svg
              v-if="status === 'loading'"
              role="status"
              aria-label="Submitting"
              class="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ t('signup.button') }}
            <svg
              v-if="status !== 'loading'"
              aria-hidden="true"
              class="w-4 h-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </button>
      </div>

      <p
        v-if="status === 'error'"
        class="mt-3 text-sm text-status-red font-display"
      >
        {{ errorMessage }}
      </p>

      <p v-if="!props.compact" class="mt-3 text-xs text-ink-3 text-center">
        {{ t('signup.privacy_note_pre') }}
        <NuxtLink to="/privacy" class="text-ink-2 hover:text-ink-1 underline underline-offset-2 transition-colors">
          {{ t('signup.privacy_note_link') }}
        </NuxtLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
/* Compact variant: tighten input + button for the slim Home email row.
   Default (non-compact) styling is unchanged. */
.email-signup.is-compact :deep(input[type="email"]) {
  padding: 10px 14px;
  font-size: 14px;
}
.email-signup.is-compact :deep(button[type="submit"]) {
  padding: 10px 18px;
  font-size: 12px;
}
.email-signup.is-compact :deep(button[type="submit"] svg) {
  width: 14px;
  height: 14px;
}
.email-signup.is-compact :deep(.text-status-green) {
  font-size: 14px;
}
.email-signup.is-compact :deep(.inline-flex.w-16.h-16) {
  width: 36px;
  height: 36px;
  margin-bottom: 8px;
}
.email-signup.is-compact :deep(.inline-flex.w-16.h-16 svg) {
  width: 20px;
  height: 20px;
}
</style>
