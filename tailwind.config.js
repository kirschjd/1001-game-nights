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
        // Core Brand Colors
        'lion': '#C19875',
        'payne-grey': '#5D5F71',
        
        // Game-specific Colors
        'uranian-blue': '#B4E1FF',
        'tea-rose': '#F8C7CC',
        
        // Dice Colors by Size
        'dice-d4': '#FF6B6B',    // Coral red
        'dice-d6': '#4ECDC4',    // Teal
        'dice-d8': '#45B7D1',    // Sky blue
        'dice-d10': '#96CEB4',   // Mint green
        'dice-d12': '#FECA57',   // Golden yellow
        
        // Extended palette for variations
        'lion-light': '#D4B08A',
        'lion-dark': '#A67C5A',
        'payne-grey-light': '#7A7C8E',
        'payne-grey-dark': '#4A4C5A',
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
  safelist: [
    // Dice colors - ensure they're not purged
    'bg-dice-d4',
    'bg-dice-d6',
    'bg-dice-d8',
    'bg-dice-d10',
    'bg-dice-d12',
    'border-red-700',
    'border-teal-700',
    'border-blue-700',
    'border-green-700',
    'border-yellow-700',
    // Game specific colors
    'text-tea-rose',
    'text-uranian-blue',
    'text-lion',
    'text-lion-light',
    'text-lion-dark',
    'text-payne-grey',
    'text-payne-grey-light',
    'text-payne-grey-dark',
    'bg-tea-rose',
    'bg-uranian-blue',
    'bg-lion',
    'bg-lion-light',
    'bg-lion-dark',
    'bg-payne-grey',
    'bg-payne-grey-light',
    'bg-payne-grey-dark',
    'border-tea-rose',
    'border-uranian-blue',
    'border-lion',
    'border-payne-grey',
    // Dynamic class variations
    'ring-uranian-blue',
    'hover:bg-lion-dark',
    'hover:bg-payne-grey-light',
  ]
}