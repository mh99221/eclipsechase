<script setup lang="ts">
import Pill from '~/components/ui/Pill.vue'
import { PROFILES, type ProfileId } from '~/composables/useRecommendation'

defineProps<{
  selectedProfile: ProfileId | null
  showWeather: boolean
  showTraffic: boolean
  showCameras: boolean
}>()

const emit = defineEmits<{
  'update:selectedProfile': [ProfileId | null]
  'update:showWeather':     [boolean]
  'update:showTraffic':     [boolean]
  'update:showCameras':     [boolean]
}>()
</script>

<template>
  <div class="chip-stack" aria-label="Map filters">
    <div class="row">
      <Pill
        :active="selectedProfile === null"
        size="sm"
        surface="glass"
        @click="emit('update:selectedProfile', null)"
      >ALL</Pill>
      <Pill
        v-for="p in PROFILES"
        :key="p.id"
        :active="selectedProfile === p.id"
        size="sm"
        surface="glass"
        @click="emit('update:selectedProfile', p.id)"
      >{{ p.name.toUpperCase() }}</Pill>
    </div>
    <div class="row">
      <Pill
        :active="showWeather"
        size="sm"
        surface="glass"
        @click="emit('update:showWeather', !showWeather)"
      >WEATHER</Pill>
      <Pill
        :active="showTraffic"
        size="sm"
        surface="glass"
        @click="emit('update:showTraffic', !showTraffic)"
      >ROADS</Pill>
      <Pill
        :active="showCameras"
        size="sm"
        surface="glass"
        @click="emit('update:showCameras', !showCameras)"
      >LIVE CAMS</Pill>
    </div>
  </div>
</template>

<style scoped>
.chip-stack {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  z-index: 5;
}
.row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  pointer-events: auto;
  scrollbar-width: none;
}
.row::-webkit-scrollbar { display: none; }
</style>
