/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#85a3ff',
          500: '#5677fc',
          600: '#3b51f1',
          700: '#2e3ed6',
          800: '#2733b0',
          900: '#242e8c',
        }
      }
    },
  },
  plugins: [],
}
