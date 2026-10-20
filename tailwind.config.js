/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./web/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5fa',
          100: '#d9e6f2',
          500: '#2e75b6',
          700: '#1f4e79',
          900: '#112d47',
        }
      }
    },
  },
  plugins: [],
}
