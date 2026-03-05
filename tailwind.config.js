/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds adaptatifs via CSS variables (avec support opacité /60, /80…)
        dark: {
          bg:     'rgb(var(--color-bg)     / <alpha-value>)',
          card:   'rgb(var(--color-card)   / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
        },
        // Accent : gardé "blue" pour ne pas casser les classes existantes
        accent: {
          blue: 'rgb(var(--color-accent) / <alpha-value>)',
          gold: '#fbbf24',
        },
        // "white" = quasi-noir en light, quasi-blanc en dark
        // → text-white, hover:text-white, bg-white s'adaptent automatiquement
        white: 'rgb(var(--color-foreground) / <alpha-value>)',
        // "off-white" = toujours blanc — pour text sur fond coloré (boutons accent, badges)
        'off-white': '#ffffff',
        // Grays adaptatifs pour le texte secondaire/tertiaire
        gray: {
          300: 'rgb(var(--color-gray-300) / <alpha-value>)',
          400: 'rgb(var(--color-gray-400) / <alpha-value>)',
          500: 'rgb(var(--color-gray-500) / <alpha-value>)',
          600: 'rgb(var(--color-gray-600) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
