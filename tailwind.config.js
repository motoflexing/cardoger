/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arcade: {
          dark: '#0a0d14',
          surface: '#121824',
          card: '#1a2233',
          border: '#2a354d',
          cyan: '#00f2fe',
          blue: '#4facfe',
          yellow: '#fbbf24',
          gold: '#f59e0b',
          crimson: '#ef4444',
          green: '#10b981',
          purple: '#8b5cf6',
        }
      },
      fontFamily: {
        game: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 2s infinite',
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        }
      }
    },
  },
  plugins: [],
}

