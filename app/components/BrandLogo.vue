<script setup lang="ts">
defineProps<{
  /** mark size in px — width = height; wordmark scales independently */
  size?: number
  /** hide the "ECLIPSECHASE" text, just render the mark */
  iconOnly?: boolean
}>()
</script>

<template>
  <div class="flex items-center gap-2.5">
    <!-- 22×22 circle, 1.5px amber outer ring. Inner 16×16 amber disc
         clipped to its left 70% creates the "moon advancing across the sun"
         eclipse glyph. The outer ring stays fully visible so the mark reads
         as a corona ring with a partial fill. -->
    <span
      class="relative inline-block rounded-full border-[1.5px] border-accent"
      :style="{ width: `${size ?? 22}px`, height: `${size ?? 22}px` }"
      aria-hidden="true"
    >
      <span
        class="absolute rounded-full bg-accent"
        style="inset: 3px; clip-path: polygon(0 0, 70% 0, 70% 100%, 0 100%);"
      />
    </span>

    <span
      v-if="!iconOnly"
      class="font-sans font-semibold text-[13px] tracking-[2px] text-text"
    >
      ECLIPSECHASE
    </span>
  </div>
</template>
