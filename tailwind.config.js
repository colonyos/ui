/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ColonyOS Brand Colors
        colony: {
          // Primary brand colors from logo
          'navy': '#0f3a47',        // Main dark teal/navy
          'teal': '#3eb8b8',        // Top-left node
          'blue': '#4a9fd8',        // Top-right node
          'purple': '#7b7fdc',      // Bottom node

          // Lighter variations for backgrounds/hovers
          'navy-light': '#1a5162',
          'navy-dark': '#0a2530',
          'teal-light': '#5ec9c9',
          'teal-dark': '#2d9f9f',
          'blue-light': '#6bb3e3',
          'blue-dark': '#3a8bc4',
          'purple-light': '#9b9ee8',
          'purple-dark': '#6265c9',
        },

        // Semantic colors using brand palette
        primary: {
          50: '#e6f2f5',
          100: '#cce5eb',
          200: '#99cbd7',
          300: '#66b1c3',
          400: '#3397af',
          500: '#0f3a47',  // Main navy
          600: '#0c2e39',
          700: '#09232b',
          800: '#06171c',
          900: '#030c0e',
        },

        accent: {
          50: '#e8f8f8',
          100: '#d1f1f1',
          200: '#a3e3e3',
          300: '#75d5d5',
          400: '#47c7c7',
          500: '#3eb8b8',  // Main teal
          600: '#329393',
          700: '#256e6e',
          800: '#194a4a',
          900: '#0c2525',
        },

        secondary: {
          50: '#e9f4fb',
          100: '#d3e9f7',
          200: '#a7d3ef',
          300: '#7bbde7',
          400: '#4fa7df',
          500: '#4a9fd8',  // Main blue
          600: '#3b7fad',
          700: '#2c5f82',
          800: '#1e4056',
          900: '#0f202b',
        }
      }
    },
  },
  plugins: [],
}
