module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          700: '#383838',
          750: '#2E2E2E',
          800: '#262626',
          850: '#1F1F1F',
          900: '#181818',
          950: '#121212',
        },
        ferrugem: {
          50: '#FDF6F3',
          100: '#FAECE5',
          200: '#F4D3C5',
          300: '#EAB29B',
          400: '#D5825D',
          500: '#C26335',
          DEFAULT: '#AF4E22',
          600: '#AF4E22',
          700: '#913D18',
          800: '#752F11',
          900: '#5A230B',
          950: '#341104',
        },
        brand: {
          50: '#FDF6F3',
          100: '#FAECE5',
          200: '#F4D3C5',
          DEFAULT: '#AF4E22',
          600: '#AF4E22',
          700: '#913D18',
          900: '#5A230B',
        }
      }
    },
  },
  plugins: [],
};
