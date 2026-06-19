/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Glucose zone colors
        'glucose-urgent-low': '#dc2626',   // red-600
        'glucose-low': '#f97316',          // orange-500
        'glucose-in-range': '#16a34a',     // green-600
        'glucose-high': '#eab308',         // yellow-500
        'glucose-urgent-high': '#dc2626',  // red-600
        'glucose-stale': '#6b7280',        // gray-500
      },
      animation: {
        'pulse-urgent': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink-stale': 'blink 2s step-end infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
}
