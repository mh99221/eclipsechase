<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { activate } = useProStatus()

useHead({ title: 'Eclipse Pro Activated' })

const status = ref<'loading' | 'success' | 'delayed'>('loading')
const sessionId = computed(() => route.query.session_id as string)

async function tryActivate(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await $fetch<{ token: string; email: string }>('/api/stripe/activate', {
        method: 'POST',
        body: { session_id: sessionId.value },
      })
      await activate(result.token)
      return true
    }
    catch (err: any) {
      if (err?.statusCode === 404 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 2000))
        continue
      }
      return false
    }
  }
  return false
}

onMounted(async () => {
  if (!sessionId.value) {
    status.value = 'delayed'
    return
  }

  const success = await tryActivate()
  status.value = success ? 'success' : 'delayed'
})
</script>

<template>
  <div class="relative noise min-h-screen pt-[72px]">
    <main class="flex items-center justify-center" style="min-height: calc(100vh - 152px)">
      <div class="text-center px-6 max-w-md">
        <!-- Loading -->
        <div v-if="status === 'loading'" class="space-y-4">
          <svg class="animate-spin h-8 w-8 text-accent mx-auto" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p class="font-mono text-sm text-ink-3 tracking-wider">
            Activating your purchase...
          </p>
        </div>

        <!-- Success -->
        <div v-else-if="status === 'success'" class="space-y-6">
          <div class="w-16 h-16 mx-auto rounded-full bg-green-900/20 border border-green-700/30 flex items-center justify-center">
            <svg class="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 class="font-display text-2xl sm:text-3xl font-bold text-ink-1 mb-2">
              You're all set!
            </h1>
            <p class="text-ink-3">
              Eclipse Pro is active. You're ready for August 12.
            </p>
          </div>
          <NuxtLink
            to="/map"
            class="inline-block btn-corona px-8 py-3 text-base"
          >
            Go to Eclipse Map &rarr;
          </NuxtLink>
        </div>

        <!-- Delayed -->
        <div v-else class="space-y-4">
          <div class="w-16 h-16 mx-auto rounded-full bg-amber-900/20 border border-amber-700/30 flex items-center justify-center">
            <svg class="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 class="font-display text-xl font-bold text-ink-1 mb-2">
              Activation is taking longer than expected
            </h1>
            <p class="text-sm text-ink-3 mb-2">
              Your payment was successful. Pro features will activate shortly.
            </p>
            <p class="text-xs text-ink-3">
              If features aren't active within 5 minutes, use Restore Purchase on the
              <NuxtLink to="/pro" class="text-accent hover:text-accent-strong transition-colors">Pro page</NuxtLink>.
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
