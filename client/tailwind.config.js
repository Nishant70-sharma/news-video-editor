/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Anton"', 'sans-serif'],
        displayAlt: ['"Bebas Neue"', 'sans-serif']
      },
      colors: {
        news: {
          bg: '#0b0e14',
          panel: '#121722',
          border: '#232a38',
          accent: '#e11d2e',
          accent2: '#2563eb'
        }
      }
    }
  },
  plugins: []
};
