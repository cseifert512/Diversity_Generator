/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Drafted.ai exact palette
        coral: {
          50: '#fff7f5',
          100: '#ffebe6',
          200: '#ffd4cc',
          300: '#ffb3a6',
          400: '#ff8d7a',
          500: '#e86c5d', // Main coral from room tags
          600: '#d4574a',
          700: '#b24439',
          800: '#8c362e',
          900: '#6e2b25',
        },
        cream: {
          50: '#fefdfb',
          100: '#fdf9f3',
          200: '#f9f1e3',
          300: '#f3e4c9',
          400: '#e8d0a4',
        },
        drafted: {
          black: '#1a1a1a',
          dark: '#2d2d2d',
          gray: '#6b6b6b',
          light: '#9a9a9a',
          muted: '#c4c4c4',
          border: '#e8e8e8',
          bg: '#f7f7f5',
          cream: '#fffcf7',
        },
        // Room colors matching drafted.ai floor plans
        room: {
          bedroom: '#e6e0f0',     // Lavender/purple
          bathroom: '#a8d5e5',    // Light blue
          kitchen: '#f4c4a0',     // Peach/salmon
          living: '#f5e6d3',      // Cream
          garage: '#d4d4d4',      // Gray
          outdoor: '#c5e8c5',     // Light green
          pool: '#87ceeb',        // Sky blue
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'drafted': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'drafted-hover': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'drafted-lg': '0 8px 24px rgba(0, 0, 0, 0.06)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'drafted': '12px',
        'drafted-lg': '16px',
        'drafted-xl': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
