/** Colors point at CSS variables (see index.css) so one class works in both dark and light themes. */
const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        base: c('base'), // page background
        panel: c('panel'), // card / glass surface
        raised: c('raised'), // inputs, hover states
        line: c('line'), // borders
        ink: c('ink'), // primary text
        mute: c('mute'), // secondary text
        silver: c('silver'), // accent
        'on-silver': c('on-silver'),
        ok: c('ok'),
        warn: c('warn'),
        bad: c('bad'),
        info: c('info'),
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        glass: '0 8px 30px rgb(0 0 0 / 0.25)',
        soft: '0 1px 2px rgb(0 0 0 / 0.2)',
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        slideIn: { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: { 'fade-up': 'fadeUp .25s ease-out both', 'slide-in': 'slideIn .25s ease-out both' },
    },
  },
  plugins: [],
};
