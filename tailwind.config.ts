import type { Config } from 'tailwindcss'

export default {
  content: [],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
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
