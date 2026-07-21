/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nova: {
          950: '#0a0e1a',
          900: '#0f1424',
          800: '#161d33',
          700: '#212a47',
          600: '#2f3b63',
          500: '#4a5a8f',
        },
        accent: {
          400: '#7c8cff',
          500: '#5b6ef5',
          600: '#4451d6',
        },
        gold: {
          400: '#e8c674',
          500: '#d4af37',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
      },
      backdropBlur: { xs: '2px' },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
