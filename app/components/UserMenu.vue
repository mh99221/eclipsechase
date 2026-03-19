<script setup lang="ts">
const { t } = useI18n()
const { proEmail, isLoggedIn, logout } = useProStatus()

const isLoggingOut = ref(false)

async function handleLogout() {
  isLoggingOut.value = true
  try {
    await logout()
    navigateTo('/pro')
  }
  finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div v-if="isLoggedIn" class="flex items-center gap-3">
    <span class="hidden sm:inline font-mono text-[10px] text-slate-500 tracking-wider truncate max-w-[160px]">
      {{ proEmail }}
    </span>
    <button
      :disabled="isLoggingOut"
      class="font-mono text-[10px] text-slate-500 hover:text-slate-300 tracking-wider uppercase transition-colors disabled:opacity-50"
      @click="handleLogout"
    >
      {{ t('auth.logout') }}
    </button>
  </div>
</template>
