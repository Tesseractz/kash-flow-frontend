/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Body — Inter is the modern SaaS standard, very readable at 14-16px.
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // Display — Space Grotesk for headings + the KashPoint wordmark.
        // Matches the landing page so brand stays consistent everywhere.
        display: [
          'Space Grotesk',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        // Numeric tabular figures for prices / amounts.
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // Brand palette — explicit so we stop hard-coding `blue-600` everywhere
        // and can shift the brand without grepping the codebase later.
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',   // primary
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',   // success/positive
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      // Layered shadows that read as depth rather than flat fills.
      boxShadow: {
        'soft':       '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'soft-md':    '0 4px 6px -1px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
        'soft-lg':    '0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.06)',
        'soft-xl':    '0 20px 25px -5px rgb(15 23 42 / 0.10), 0 8px 10px -6px rgb(15 23 42 / 0.06)',
        'soft-2xl':   '0 25px 50px -12px rgb(15 23 42 / 0.20)',
        // Inner glow on focused inputs.
        'focus-ring': '0 0 0 4px rgb(37 99 235 / 0.15)',
        // For raised brand-color buttons.
        'brand':      '0 10px 20px -10px rgb(37 99 235 / 0.50)',
        'accent':     '0 10px 20px -10px rgb(5 150 105 / 0.50)',
        'danger':     '0 10px 20px -10px rgb(220 38 38 / 0.50)',
      },
      backgroundImage: {
        // Subtle gradients for hero surfaces — used sparingly.
        'brand-gradient':  'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
        // Deep ink for the sign-in panel. A saturated blue slab reads as a
        // template; ink with a single restrained green lift matches the
        // KashPoint mark, which is green — not blue.
        'ink-gradient':    'linear-gradient(155deg, #0b1220 0%, #101d31 48%, #052e24 100%)',
        'accent-gradient': 'linear-gradient(135deg, #059669 0%, #14b8a6 100%)',
        'warm-gradient':   'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        'mesh-light':      'radial-gradient(at 30% 0%, rgb(219 234 254 / 0.6) 0px, transparent 50%), radial-gradient(at 100% 0%, rgb(209 250 229 / 0.4) 0px, transparent 50%)',
        'mesh-dark':       'radial-gradient(at 30% 0%, rgb(29 78 216 / 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgb(5 95 70 / 0.10) 0px, transparent 50%)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in':      { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-up':     { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'slide-down':   { '0%': { opacity: 0, transform: 'translateY(-8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'scale-in':     { '0%': { opacity: 0, transform: 'scale(0.96)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        'shimmer':      { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in':    'fade-in 200ms ease-out both',
        'slide-up':   'slide-up 250ms ease-out both',
        'slide-down': 'slide-down 250ms ease-out both',
        'scale-in':   'scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer':    'shimmer 1.4s infinite',
      },
      transitionTimingFunction: {
        // A snappier ease for micro-interactions.
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
