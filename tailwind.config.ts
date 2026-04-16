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
      },
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
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
