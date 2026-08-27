/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors (Indigo)
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5', // Primary Color (#4F46E5)
          700: '#4338CA',
          800: '#3730A3', // Primary Hover / Dark Variant (#3730A3)
          900: '#312E81',
          950: '#1E1B4B',
          DEFAULT: '#4F46E5',
        },
        // Application Neutral Slate Palette
        slate: {
          50: '#F8FAFC',  // Application Background (#F8FAFC)
          100: '#F1F5F9',
          200: '#E2E8F0', // Border / Divider (#E2E8F0)
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B', // Secondary Text (#64748B)
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A', // Primary Text (#0F172A)
          950: '#020617',
        },
        // Semantic Status Colors
        status: {
          success: {
            DEFAULT: '#16A34A', // Success Green (#16A34A)
            light: '#DCFCE7',
            border: '#86EFAC',
            text: '#15803D',
          },
          warning: {
            DEFAULT: '#D97706', // Warning Amber (#D97706)
            light: '#FEF3C7',
            border: '#FDE68A',
            text: '#B45309',
          },
          error: {
            DEFAULT: '#DC2626', // Error / Destructive Red (#DC2626)
            light: '#FEE2E2',
            border: '#FCA5A5',
            text: '#B91C1C',
          },
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          '"Fira Sans"',
          '"Droid Sans"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      }
    },
  },
  plugins: [],
};
