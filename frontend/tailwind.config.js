/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#157F19',
          50: '#F0F8F1',
          100: '#E8F5E9',
          200: '#B6E8BC',
          400: '#29D52F',
          600: '#157F19',
          700: '#0E6313',
          900: '#1B3120',
        },
        ink: {
          DEFAULT: '#1B3120',
          muted: '#525252',
          subtle: '#989393',
          faint: '#C0BDBD',
        },
        surface: {
          DEFAULT: '#FAFAFA',
          card: '#FFFFFF',
          alt: '#F8F8F8',
          mint: '#FAFFFE',
          panel: '#F0F4F1',
        },
        warn: {
          50: '#FFF8E1',
          400: '#FFB800',
          700: '#B45309',
        },
        danger: {
          50: '#FDECEC',
          200: '#FAC0C0',
          600: '#C53030',
        },
        line: '#E3E3E3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(27, 49, 32, 0.04), 0 1px 3px 0 rgba(27, 49, 32, 0.06)',
        pop: '0 12px 32px -8px rgba(21, 127, 25, 0.18)',
      },
    },
  },
  plugins: [],
};
