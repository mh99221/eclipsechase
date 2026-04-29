import type { Config } from 'tailwindcss'

export default {
  content: [],
  darkMode: 'class', // theme toggle via .dark / .light class on <html>
  theme: {
    extend: {
      colors: {
        // Legacy palette — still valid for dark theme usage and any place
        // we've hardcoded void/corona/ice. Kept unchanged so current dark
        // styling continues to work while we incrementally migrate to
        // semantic tokens (--surface, --ink, etc.) defined in main.css.
        void: {
          DEFAULT: '#050810',
          deep: '#030508',
          surface: '#0a1020',
          elevated: '#111a2e',
          border: '#1a2540',
        },
        corona: {
          DEFAULT: '#f59e0b',
          bright: '#fbbf24',
          pale: '#fef3c7',
          dim: '#b45309',
          glow: 'rgba(245, 158, 11, 0.15)',
        },
        ice: {
          DEFAULT: '#7dd3fc',
          dim: '#38bdf8',
          faint: 'rgba(125, 211, 252, 0.08)',
        },

        // Semantic tokens — use these going forward so styles respond to
        // theme swaps automatically. Mapped to CSS variables defined in
        // assets/css/main.css. Tailwind's `text-ink-1`, `bg-surface`, etc.
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
        'corona-pulse': 'corona-pulse 4s ease-in-out infinite',
        'drift-slow': 'drift 60s linear infinite',
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'fade-in': 'fade-in 1s ease-out forwards',
      },
      keyframes: {
        'corona-pulse': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        drift: {
          '0%': { transform: 'translateX(0) translateY(0)' },
          '25%': { transform: 'translateX(10px) translateY(-5px)' },
          '50%': { transform: 'translateX(5px) translateY(10px)' },
          '75%': { transform: 'translateX(-5px) translateY(5px)' },
          '100%': { transform: 'translateX(0) translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
} satisfies Config
