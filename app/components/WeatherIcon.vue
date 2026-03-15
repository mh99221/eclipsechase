<script setup lang="ts">
import { weatherSvgHtml } from '~/utils/eclipse'

const props = withDefaults(defineProps<{
  cloudCover: number | null
  size?: number
}>(), {
  size: 36,
})

const svgMarkup = computed(() => weatherSvgHtml(props.cloudCover, props.size))
</script>

<template>
  <span v-html="svgMarkup" />
</template>
