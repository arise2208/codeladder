/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gh: {
          bg: '#1a1a1a',
          surface: '#282828',
          subtle: '#333333',
          border: '#383838',
          'border-subtle': '#2d2d2d',
          text: '#eff2f6',
          muted: '#8b949e',
          subtleText: '#6e7681',
          sidebar: '#1a1a1a',
          blue: '#ffa116',
          'blue-bg': '#ffa116',
          green: '#2cbb5d',
          'green-hover': '#38cf6e',
          'green-text': '#2cbb5d',
          orange: '#ffa116',
          'orange-text': '#ffa116',
          red: '#ef4743',
          'red-text': '#ef4743',
          accent: '#ffa116',
          'accent-hover': '#ffb84d',
        },
        leetcode: {
          bg: '#1a1a1a',
          surface: '#282828',
          subtle: '#333333',
          border: '#383838',
          text: '#eff2f6',
          muted: '#8b949e',
          accent: '#ffa116',
          'accent-hover': '#ffb84d',
        }
      }
    },
  },
  plugins: [],
}