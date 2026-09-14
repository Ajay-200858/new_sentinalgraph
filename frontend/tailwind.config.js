/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soc: {
          bg: '#0a0e27',
          card: '#1a1f3a',
          input: '#0f1425',
          border: '#2d3f5b',
          'neon-green': '#00ff88',
          magenta: '#ff00ff',
          cyan: '#00d4ff',
          warning: '#ffaa00',
          danger: '#ff0055',
          critical: '#ff0000',
          primary: '#e0e0ff',
          secondary: '#a0a8c0',
          muted: '#6b7280',
        },
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'],
        'lg': ['18px', '28px'],
        'xl': ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '36px'],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '8px',
        'lg': '8px',
        'xl': '12px',
        'full': '9999px',
      },
    },
  },
  plugins: [],
};
