/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        card: 'var(--card)',
        soft: 'var(--soft)',
        soft2: 'var(--soft-2)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        brand: '#7c41f5',
        brandDeep: '#6530d6',
        brandSoft: 'var(--brand-soft)',
        sun: '#f5c525',
        sunSoft: 'var(--sun-soft)',
        coral: '#ff9062',
        coralSoft: 'var(--coral-soft)',
        aqua: '#3acbe8',
        aquaSoft: 'var(--aqua-soft)',
        banner: 'var(--banner)',
        bannerInk: 'var(--banner-ink)',
        bannerMuted: 'var(--banner-muted)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        // Keep shadow token names distinct from the `panel`/`card` color tokens.
        // Tailwind otherwise emits conflicting `shadow-panel`/`shadow-card` utilities.
        panelLift: '0 34px 90px -32px rgba(76, 47, 153, .38), 0 12px 34px rgba(76, 47, 153, .1)',
        cardLift: '0 8px 24px rgba(52, 41, 94, .045)',
        float: '0 16px 32px -10px rgba(124, 65, 245, .5)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
