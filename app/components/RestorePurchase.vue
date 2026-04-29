<script setup lang="ts">
const { t } = useI18n()
const { activate } = useProStatus()

type State = 'idle' | 'email_input' | 'code_sent' | 'code_input' | 'verifying' | 'success' | 'error'

const state = ref<State>('idle')
const email = ref('')
const maskedEmail = ref('')
const code = ref(['', '', '', '', '', ''])
const error = ref('')
const submitting = ref(false)

const codeInputRefs = ref<(HTMLInputElement | null)[]>([])

function startRestore() {
  state.value = 'email_input'
}

async function sendCode() {
  if (!email.value || !email.value.includes('@')) return

  submitting.value = true
  error.value = ''

  try {
    const result = await $fetch<{ sent: boolean; masked_email: string }>('/api/stripe/restore/request', {
      method: 'POST',
      body: { email: email.value },
    })
    maskedEmail.value = result.masked_email
    state.value = 'code_sent'
    // Auto-transition to code input after showing "code sent" message
    setTimeout(() => {
      state.value = 'code_input'
      nextTick(() => codeInputRefs.value[0]?.focus())
    }, 1500)
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || 'Something went wrong'
    state.value = 'error'
  }
  finally {
    submitting.value = false
  }
}

function handleDigitInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '')

  if (value.length > 0) {
    code.value[index] = value[0]
    // Auto-advance to next input
    if (index < 5) {
      nextTick(() => codeInputRefs.value[index + 1]?.focus())
    }
  }
  else {
    code.value[index] = ''
  }

  // Auto-submit when all 6 digits entered
  const fullCode = code.value.join('')
  if (fullCode.length === 6) {
    verifyCode(fullCode)
  }
}

function handleKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !code.value[index] && index > 0) {
    nextTick(() => codeInputRefs.value[index - 1]?.focus())
  }
}

async function verifyCode(fullCode: string) {
  state.value = 'verifying'
  error.value = ''

  try {
    const result = await $fetch<{ token: string }>('/api/stripe/restore/verify', {
      method: 'POST',
      body: { email: email.value, code: fullCode },
    })
    await activate(result.token)
    state.value = 'success'
    setTimeout(() => navigateTo('/map'), 2000)
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || 'Invalid or expired code'
    state.value = 'error'
    code.value = ['', '', '', '', '', '']
  }
}

function retry() {
  error.value = ''
  code.value = ['', '', '', '', '', '']
  state.value = 'email_input'
}
</script>

<template>
  <div class="mt-8">
    <!-- Idle: just a link -->
    <div v-if="state === 'idle'" class="text-center">
      <button
        class="text-xs font-mono text-ink-3 hover:text-ink-2 transition-colors"
        @click="startRestore"
      >
        Already purchased? Restore here
      </button>
    </div>

    <!-- Restore form -->
    <div v-else class="bg-surface-raised border border-border-subtle/40 rounded p-6">
      <h3 class="font-display text-lg font-semibold text-ink-1 mb-1">
        Restore Purchase
      </h3>

      <!-- Email input -->
      <div v-if="state === 'email_input'">
        <p class="text-sm text-ink-3 mb-4">
          Enter the email you used when purchasing.
        </p>
        <div class="flex gap-2">
          <input
            v-model="email"
            type="email"
            placeholder="you@example.com"
            class="flex-1 px-4 py-2.5 rounded bg-bg border border-border-subtle/40 text-ink-1 placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-accent/50 transition-colors"
            @keydown.enter="sendCode"
          >
          <button
            :disabled="submitting"
            class="px-4 py-2.5 rounded bg-bg border border-border-subtle/40 text-ink-1 font-mono text-sm hover:border-accent/50 transition-colors disabled:opacity-50 whitespace-nowrap"
            @click="sendCode"
          >
            <span v-if="submitting">...</span>
            <span v-else>Send Code</span>
          </button>
        </div>
      </div>

      <!-- Code sent message -->
      <div v-else-if="state === 'code_sent'">
        <p class="text-sm text-status-green">
          Code sent to {{ maskedEmail }}. Check your email.
        </p>
      </div>

      <!-- Code input -->
      <div v-else-if="state === 'code_input'">
        <p class="text-sm text-ink-3 mb-4">
          Enter the 6-digit code sent to {{ maskedEmail }}
        </p>
        <div class="flex gap-2 justify-center mb-4">
          <input
            v-for="(_, i) in 6"
            :key="i"
            :ref="(el) => { codeInputRefs[i] = el as HTMLInputElement }"
            :value="code[i]"
            type="text"
            inputmode="numeric"
            maxlength="1"
            class="w-11 h-13 text-center text-xl font-display font-bold rounded bg-bg border border-border-subtle/40 text-ink-1 focus:outline-none focus:border-accent/50 transition-colors"
            @input="handleDigitInput(i, $event)"
            @keydown="handleKeydown(i, $event)"
          >
        </div>
      </div>

      <!-- Verifying -->
      <div v-else-if="state === 'verifying'" class="text-center py-4">
        <svg class="animate-spin h-6 w-6 text-accent mx-auto mb-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p class="font-mono text-sm text-ink-3">Verifying...</p>
      </div>

      <!-- Success -->
      <div v-else-if="state === 'success'" class="text-center py-4">
        <svg class="w-8 h-8 text-status-green mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p class="font-display text-lg font-semibold text-ink-1">
          Purchase restored!
        </p>
        <p class="font-mono text-xs text-ink-3 mt-1">Redirecting to map...</p>
      </div>

      <!-- Error -->
      <div v-else-if="state === 'error'">
        <p class="text-sm text-status-red mb-3">{{ error }}</p>
        <button
          class="text-sm font-mono text-accent hover:text-accent-strong transition-colors"
          @click="retry"
        >
          Try again
        </button>
      </div>
    </div>
  </div>
</template>
