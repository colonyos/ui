import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ColonyOS Brand Colors - mapped to Tailwind defaults for consistency
        colony: {
          // Primary brand colors using Tailwind defaults
          'navy': colors.cyan[900],        // was #0f3a47 -> cyan-900 #164e63 (close match)
          'teal': colors.teal[500],        // was #3eb8b8 -> teal-500 #14b8a6 (very close)
          'blue': colors.sky[500],         // was #4a9fd8 -> sky-500 #0ea5e9 (close match)
          'purple': colors.indigo[400],    // was #7b7fdc -> indigo-400 #818cf8 (nearly identical)

          // Lighter variations for backgrounds/hovers
          'navy-light': colors.cyan[800],
          'navy-dark': colors.cyan[950],
          'teal-light': colors.teal[400],
          'teal-dark': colors.teal[600],
          'blue-light': colors.sky[400],
          'blue-dark': colors.sky[600],
          'purple-light': colors.indigo[300],
          'purple-dark': colors.indigo[500],
        },

        // Semantic colors using Tailwind's cyan scale (navy-based)
        primary: colors.cyan,

        // Semantic colors using Tailwind's teal scale
        accent: colors.teal,

        // Semantic colors using Tailwind's sky scale (blue-based)
        secondary: colors.sky,
      }
    },
  },
  plugins: [],
};
