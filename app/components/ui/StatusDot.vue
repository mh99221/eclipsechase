<script setup lang="ts">
import type { V0Status } from '~/utils/v0'
defineProps<{ status: V0Status; size?: number }>()
</script>

<template>
  <span
    class="status-dot"
    :data-status="status"
    :style="{ width: `${size ?? 8}px`, height: `${size ?? 8}px` }"
    aria-hidden="true"
  />
</template>

<style scoped>
.status-dot {
  display: inline-block;
  border-radius: 99px;
  vertical-align: middle;
}
.status-dot[data-status='good']     { background: rgb(var(--good)); }
.status-dot[data-status='marginal'] { background: rgb(var(--warn)); }
.status-dot[data-status='bad']      { background: rgb(var(--bad)); }
</style>
