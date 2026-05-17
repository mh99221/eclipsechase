<script setup lang="ts">
</script>

<template>
  <div class="relative w-56 h-56 sm:w-72 sm:h-72 md:w-96 md:h-96 eclipse-hero-fade">
    <!-- CSS blur glow behind SVG for soft ambient haze -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="eclipse-haze w-[65%] h-[65%] rounded-full" />
    </div>

    <svg
      class="relative w-full h-full"
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <!-- Outer diffuse corona glow -->
        <radialGradient id="corona-haze" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.28" stop-color="#f59e0b" stop-opacity="0" />
          <stop offset="0.34" stop-color="#d97706" stop-opacity="0.06" />
          <stop offset="0.40" stop-color="#f59e0b" stop-opacity="0.15" />
          <stop offset="0.48" stop-color="#f59e0b" stop-opacity="0.04" />
          <stop offset="0.65" stop-color="#b45309" stop-opacity="0.02" />
          <stop offset="1" stop-color="#f59e0b" stop-opacity="0" />
        </radialGradient>

        <!-- Bright prominence glow -->
        <radialGradient id="prominence-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#fef3c7" stop-opacity="1" />
          <stop offset="0.3" stop-color="#fbbf24" stop-opacity="0.9" />
          <stop offset="0.6" stop-color="#f59e0b" stop-opacity="0.4" />
          <stop offset="1" stop-color="#f59e0b" stop-opacity="0" />
        </radialGradient>

        <!-- Blur filter for corona softness -->
        <filter id="corona-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>

        <!-- Heavier blur for outer haze -->
        <filter id="haze-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>

        <!-- Blur for prominences -->
        <filter id="prominence-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <!-- Layer 1: Outer diffuse haze -->
      <circle cx="200" cy="200" r="195" fill="url(#corona-haze)" filter="url(#haze-blur)" />

      <!-- Layer 2: Mid corona glow (blurred ring) -->
      <circle
        cx="200" cy="200" r="86"
        fill="none"
        stroke="#d97706"
        stroke-width="18"
        opacity="0.3"
        filter="url(#haze-blur)"
      />

      <!-- Layer 3: Inner corona glow (medium blur) -->
      <circle
        cx="200" cy="200" r="82"
        fill="none"
        stroke="#f59e0b"
        stroke-width="10"
        opacity="0.6"
        filter="url(#corona-blur)"
      />

      <!-- Layer 4: Soft bright corona ring -->
      <circle
        cx="200" cy="200" r="80"
        fill="none"
        stroke="#fbbf24"
        stroke-width="4"
        opacity="0.55"
        filter="url(#corona-blur)"
      />

      <!-- Prominence 1: Upper-left (~11 o'clock position) — behind disc -->
      <circle
        cx="147" cy="144"
        r="14"
        fill="url(#prominence-glow)"
        filter="url(#prominence-blur)"
        class="prominence-fade"
        style="animation-duration: 6s"
      />

      <!-- Prominence 2: Right (~3 o'clock position) -->
      <circle
        cx="270" cy="197"
        r="17"
        fill="url(#prominence-glow)"
        filter="url(#prominence-blur)"
        class="prominence-fade"
        style="animation-duration: 8s; animation-delay: -2s"
      />

      <!-- Prominence 3: Lower-right (~6 o'clock position) -->
      <circle
        cx="200" cy="282"
        r="4"
        fill="url(#prominence-glow)"
        filter="url(#prominence-blur)"
        class="prominence-fade"
        style="animation-duration: 5s; animation-delay: -3.5s"
      />

      <!-- Prominence 4: Lower-right (~5 o'clock position) -->
      <circle
        cx="240" cy="254"
        r="35"
        fill="url(#prominence-glow)"
        filter="url(#prominence-blur)"
        class="prominence-fade"
        style="animation-duration: 7s; animation-delay: -1s"
      />

      <!-- Moon disc — solid black, blocks corona behind it -->
      <circle cx="200" cy="200" r="76" fill="#050810" />

      <!-- Moon surface — craters, maria, and terrain irregularities -->
      <!-- Large maria (dark basaltic plains) -->
      <ellipse cx="183" cy="185" rx="18" ry="14" fill="#080c16" opacity="0.35" />
      <ellipse cx="218" cy="198" rx="12" ry="16" fill="#070b14" opacity="0.25" />
      <ellipse cx="195" cy="222" rx="15" ry="10" fill="#080c16" opacity="0.2" />

      <!-- Medium craters -->
      <circle cx="172" cy="178" r="8" fill="#0a0f1a" opacity="0.3" />
      <circle cx="210" cy="170" r="6" fill="#090d18" opacity="0.2" />
      <circle cx="228" cy="210" r="7" fill="#0a0f1a" opacity="0.25" />
      <circle cx="185" cy="230" r="5" fill="#080c16" opacity="0.2" />
      <circle cx="200" cy="195" r="9" fill="#070b14" opacity="0.15" />

      <!-- Small craters and surface detail -->
      <circle cx="165" cy="200" r="3" fill="#0b1020" opacity="0.3" />
      <circle cx="220" cy="185" r="3.5" fill="#090e1a" opacity="0.2" />
      <circle cx="192" cy="210" r="2.5" fill="#0a0f1c" opacity="0.25" />
      <circle cx="205" cy="178" r="2" fill="#0b1020" opacity="0.2" />
      <circle cx="178" cy="215" r="4" fill="#080d18" opacity="0.18" />
      <circle cx="215" cy="225" r="3" fill="#090e1a" opacity="0.15" />
      <circle cx="190" cy="175" r="2.5" fill="#0a1020" opacity="0.22" />

      <!-- Crater rims (subtle bright edges) -->
      <circle cx="172" cy="178" r="8.5" fill="none" stroke="#0e1424" stroke-width="0.5" opacity="0.3" />
      <circle cx="228" cy="210" r="7.5" fill="none" stroke="#0e1424" stroke-width="0.5" opacity="0.25" />
      <circle cx="200" cy="195" r="9.5" fill="none" stroke="#0d1322" stroke-width="0.4" opacity="0.2" />

      <!-- Highland ridges (subtle lighter patches) -->
      <ellipse cx="210" cy="190" rx="5" ry="8" fill="#0c1120" opacity="0.15" transform="rotate(-20 210 190)" />
      <ellipse cx="178" cy="205" rx="7" ry="4" fill="#0c1120" opacity="0.12" transform="rotate(35 178 205)" />
      <ellipse cx="198" cy="168" rx="4" ry="6" fill="#0b1020" opacity="0.1" transform="rotate(-10 198 168)" />

      <!-- Layer 5: Thin warm inner edge (slightly off-center, on top of disc) -->
      <circle
        cx="201" cy="200" r="78"
        fill="none"
        stroke="#fef3c7"
        stroke-width="1"
        opacity="0.4"
      />

      <!-- Non-uniform corona brightness (on top of disc for edge glow) -->
      <path
        d="M 280 200 A 80 80 0 0 1 200 280"
        fill="none"
        stroke="#fbbf24"
        stroke-width="6"
        opacity="0.25"
        filter="url(#corona-blur)"
      />
      <path
        d="M 200 120 A 80 80 0 0 1 270 170"
        fill="none"
        stroke="#fef3c7"
        stroke-width="4"
        opacity="0.15"
        filter="url(#corona-blur)"
      />
    </svg>
  </div>
</template>

<style scoped>
.eclipse-hero-fade {
  animation: eclipse-hero-fade-in 2s ease-out both;
}
@keyframes eclipse-hero-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.eclipse-haze {
  background: radial-gradient(
    circle,
    rgba(245, 158, 11, 0.2) 0%,
    rgba(217, 119, 6, 0.1) 30%,
    rgba(180, 83, 9, 0.04) 50%,
    transparent 70%
  );
  filter: blur(30px);
  animation: haze-pulse 5s ease-in-out infinite;
}

.prominence-fade {
  animation: prominence-pulse ease-in-out infinite;
}

@keyframes prominence-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes haze-pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.06); }
}
</style>
