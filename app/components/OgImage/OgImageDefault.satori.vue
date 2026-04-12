<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  label?: string
}>()
</script>

<template>
  <div
    style="
      width: 1200px;
      height: 630px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 80px;
      background: radial-gradient(ellipse at 50% 0%, #0a1628 0%, #050810 70%);
      position: relative;
      overflow: hidden;
      font-family: 'Manrope', system-ui, sans-serif;
    "
  >
    <!-- Ambient glow -->
    <div
      style="
        position: absolute;
        top: -100px;
        right: -100px;
        width: 500px;
        height: 500px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%);
      "
    />

    <!-- Eclipse icon -->
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 40px;">
      <svg width="48" height="48" viewBox="0 0 128 128" fill="none">
        <circle cx="64" cy="64" r="36" fill="#050810" />
        <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
        <circle cx="96" cy="48" r="4" fill="#f59e0b" />
      </svg>
      <span style="font-size: 20px; font-weight: 600; color: #94a3b8; letter-spacing: 0.1em;">
        ECLIPSECHASE.IS
      </span>
    </div>

    <!-- Label -->
    <div
      v-if="label"
      style="
        font-family: 'IBM Plex Mono', monospace;
        font-size: 14px;
        color: #f59e0b;
        opacity: 0.7;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        margin-bottom: 16px;
      "
    >
      {{ label }}
    </div>

    <!-- Title -->
    <div
      style="
        font-size: 56px;
        font-weight: 700;
        color: #f1f5f9;
        line-height: 1.15;
        max-width: 900px;
      "
    >
      {{ title || 'Find Clear Skies on Eclipse Day' }}
    </div>

    <!-- Subtitle -->
    <div
      v-if="subtitle"
      style="
        font-size: 22px;
        color: #94a3b8;
        margin-top: 20px;
        max-width: 800px;
        line-height: 1.5;
      "
    >
      {{ subtitle }}
    </div>

    <!-- Bottom bar -->
    <div
      style="
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, transparent, #f59e0b, transparent);
        opacity: 0.6;
      "
    />

    <!-- Date badge -->
    <div
      style="
        position: absolute;
        bottom: 40px;
        right: 80px;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 14px;
        color: #475569;
        letter-spacing: 0.15em;
      "
    >
      AUGUST 12, 2026
    </div>
  </div>
</template>
