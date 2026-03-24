import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        // Tailwind classes now reference CSS variables from main.css
        // Example: bg-primary → background: var(--c-accent)
        primary: {
          DEFAULT: 'var(--c-accent)',
          hover: 'var(--c-accent-hover)',
          light: 'var(--c-accent-light)',
        },
        bg: 'var(--c-bg)',
        surface: 'var(--c-surface)',
        border: {
          DEFAULT: 'var(--c-border)',
          strong: 'var(--c-border-strong)',
        },
        text: {
          primary: 'var(--c-text-primary)',
          secondary: 'var(--c-text-secondary)',
          tertiary: 'var(--c-text-tertiary)',
        },
        success: {
          DEFAULT: 'var(--c-success)',
          light: 'var(--c-success-light)',
        },
        warning: {
          DEFAULT: 'var(--c-warning)',
          light: 'var(--c-warning-light)',
        },
        danger: {
          DEFAULT: 'var(--c-danger)',
          light: 'var(--c-danger-light)',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
