<template>
  <svg :class="sizeClass" viewBox="0 0 128 128" fill="none">
    <circle cx="64" cy="64" r="36" fill="#050810" />
    <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" :opacity="strokeOpacity" />
    <circle cx="96" cy="48" :r="dotRadius" fill="#f59e0b" :opacity="dotOpacity" />
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'nav' | 'footer'
}>(), {
  size: 'nav',
})

const sizeClass = computed(() => props.size === 'nav' ? 'w-8 h-8' : 'w-5 h-5')
const strokeOpacity = computed(() => props.size === 'nav' ? '0.8' : '0.6')
const dotRadius = computed(() => props.size === 'nav' ? 4 : 3)
const dotOpacity = computed(() => props.size === 'nav' ? '1' : '0.8')
</script>
