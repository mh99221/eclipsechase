import type { Config } from 'tailwindcss'

export default {
  content: [],
  darkMode: 'class', // theme toggle via .dark / .light class on <html>
  theme: {
    extend: {
      colors: {
        // Semantic tokens — all styling responds to theme swaps automatically
        // via the CSS variables defined in assets/css/main.css. The pre-v0
        // legacy palette aliases (void/corona/ice) were removed in 9a06b1d's
        // follow-up — the few remaining decorative dark-theme accents now use
        // Tailwind arbitrary values like `text-[#7dd3fc]` directly.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        'border-subtle': 'rgb(var(--border-subtle) / <alpha-value>)',
        ink: {
          1: 'rgb(var(--ink-1) / <alpha-value>)',
          2: 'rgb(var(--ink-2) / <alpha-value>)',
          3: 'rgb(var(--ink-3) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
          soft:   'rgb(var(--accent-soft) / <alpha-value>)',
        },

        // v0 tokens (added 2026-04-27)
        'bg-elevated':    'rgb(var(--bg-elevated) / <alpha-value>)',
        'surface-solid':  'rgb(var(--surface-solid) / <alpha-value>)',
        'border-strong':  'rgb(var(--border-strong) / <alpha-value>)',
        totality:         'rgb(var(--totality) / <alpha-value>)',
        cream:            'rgb(var(--cream) / <alpha-value>)',
        good:             'rgb(var(--good) / <alpha-value>)',
        warn:             'rgb(var(--warn) / <alpha-value>)',
        bad:              'rgb(var(--bad) / <alpha-value>)',
        'chart-track':    'rgb(var(--chart-track) / <alpha-value>)',

        // BrandLogo + v0 prototype literal aliases — `text-text` resolves
        // to the cream ink-1 token so the v0-spec snippets work as-is.
        text: 'rgb(var(--ink-1) / <alpha-value>)',
        // `text-text-dim` matches the v0 token name for secondary copy.
        // Same value as text-ink-1 with /62 alpha — exposed under both
        // names so the v0 snippets work without renaming.
        'text-dim': 'rgba(232,229,220,0.62)',

        // Light-theme additions (CLAUDE_CODE_LIGHT_THEME_SPEC.md §3):
        // - accent-ink: text/icons sitting ON `accent` fills (CTA labels)
        // - glass / glass-strong / glass-chip: scrims for photo/map overlays.
        //   Stay dark in both themes since they sit over dark imagery.
        'accent-ink':   'rgb(var(--accent-ink) / <alpha-value>)',
        glass:          'rgb(var(--glass) / <alpha-value>)',
        'glass-strong': 'rgb(var(--glass-strong) / <alpha-value>)',
        'glass-chip':   'rgb(var(--glass-chip) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Inter Tight"', '-apple-system', 'system-ui', 'sans-serif'],
        body:    ['"Inter Tight"', '-apple-system', 'system-ui', 'sans-serif'],
        sans:    ['"Inter Tight"', '-apple-system', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in': 'fade-in 1s ease-out forwards',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
} satisfies Config
