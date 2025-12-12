module.exports = {
  content: [
    "./src/**/*.{html,ts}", 
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        muted: 'var(--color-muted)',
        danger: 'var(--color-danger)'
      },
      fontFamily: {
        body: ['var(--font-family)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-family)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '9': '2.25rem',
      },
    },
  },
  plugins: [  ],
};


