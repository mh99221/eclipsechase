<script setup lang="ts">
const { t } = useI18n()

const props = withDefaults(defineProps<{
  label?: string
  variant?: 'primary' | 'inline'
}>(), {
  label: '',
  variant: 'primary',
})

const submitting = ref(false)

async function handleCheckout() {
  submitting.value = true
  try {
    const { url } = await $fetch<{ url: string }>('/api/stripe/checkout', {
      method: 'POST',
    })
    if (url) {
      window.location.href = url
    }
  }
  catch (err) {
    console.error('Checkout failed:', err)
    submitting.value = false
  }
}

const buttonLabel = computed(() => props.label || t('pro.get_access'))
</script>

<template>
  <button
    v-if="variant === 'primary'"
    :disabled="submitting"
    class="btn-corona w-full text-base py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
    @click="handleCheckout"
  >
    <span v-if="submitting" class="inline-flex items-center gap-2">
      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>{{ t('pro.processing') }}</span>
    </span>
    <span v-else>{{ buttonLabel }}</span>
  </button>
  <button
    v-else
    :disabled="submitting"
    class="text-sm text-corona hover:text-corona-bright transition-colors disabled:opacity-50"
    @click="handleCheckout"
  >
    <span v-if="submitting">{{ t('pro.processing') }}</span>
    <span v-else>{{ buttonLabel }} &rarr;</span>
  </button>
</template>
