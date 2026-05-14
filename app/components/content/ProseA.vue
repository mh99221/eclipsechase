<script setup lang="ts">
// Nuxt Content's default ProseA renders a plain <a>, so absolute internal
// links in markdown (e.g. /spots/foo, /map) bypass i18n routing and always
// resolve to the EN paths under `prefix_except_default`. Route internal
// hrefs through localePath() so /is/guide links stay on /is/* instead of
// silently sending readers to the English version.
const props = defineProps<{
  href?: string
  title?: string
  target?: string
}>()

const localePath = useLocalePath()

const isInternal = computed(() => {
  const h = props.href ?? ''
  return h.startsWith('/') && !h.startsWith('//')
})

const resolvedHref = computed(() => {
  if (!props.href) return props.href
  return isInternal.value ? localePath(props.href) : props.href
})

const rel = computed(() =>
  props.target === '_blank' ? 'noopener noreferrer' : undefined,
)
</script>

<template>
  <NuxtLink
    v-if="isInternal"
    :to="resolvedHref"
    :title="title"
  >
    <slot />
  </NuxtLink>
  <a
    v-else
    :href="resolvedHref"
    :title="title"
    :target="target"
    :rel="rel"
  >
    <slot />
  </a>
</template>
