/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      colors: {
        'game-blue': {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
        'game-purple': {
          50: '#faf5ff',
          500: '#8b5cf6',
          900: '#581c87',
        },
      },
      fontFamily: {
        'game': ['Comic Sans MS', 'cursive'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}