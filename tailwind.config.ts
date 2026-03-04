import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'confetti-pop': {
          '0%': { transform: 'translate(-50%, -50%) translate(0, 0)', opacity: '1' },
          '100%': { transform: 'translate(-50%, -50%) translate(var(--confetti-x), var(--confetti-y))', opacity: '0' },
        },
        'confetti-rain': {
          '0%': { transform: 'translateY(0) translateX(0) rotate(0)', opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { transform: 'translateY(100vh) translateX(var(--confetti-drift)) rotate(var(--confetti-rot))', opacity: '0' },
        },
      },
      animation: {
        'confetti-pop': 'confetti-pop 0.5s ease-out forwards',
        'confetti-rain': 'confetti-rain ease-in forwards',
      },
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        accent: 'var(--color-accent)',
        'accent-tint': 'var(--color-accent-tint)',
        'note-accent': 'var(--color-note-accent)',
        today: 'var(--color-today)',
      },
    },
  },
  plugins: [],
}

export default config
