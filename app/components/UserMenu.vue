<script setup lang="ts">
const { t } = useI18n()
const { isPro, loading, clearPro } = useProStatus()

const isLoggingOut = ref(false)

async function handleLogout() {
  isLoggingOut.value = true
  try {
    await clearPro()
    navigateTo('/pro')
  }
  finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div v-if="isPro && !loading" class="flex items-center gap-3">
    <span class="hidden sm:inline font-mono text-[10px] text-corona/60 tracking-wider uppercase">
      {{ t('pro.badge', 'Pro') }}
    </span>
    <ThemeToggle />
    <button
      :disabled="isLoggingOut"
      class="font-mono text-[10px] text-slate-500 hover:text-slate-300 tracking-wider uppercase transition-colors disabled:opacity-50"
      @click="handleLogout"
    >
      {{ t('auth.logout') }}
    </button>
  </div>
</template>
