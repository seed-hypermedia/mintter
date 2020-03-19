const {colors} = require('tailwindcss/defaultTheme')

module.exports = {
  theme: {
    extend: {},
    colors: {
      ...colors,
      background: {
        ...colors.background,
        primary: 'var(--bg-background-primary)',
        secondary: 'var(--bg-background-secondary)',
      },
    },
  },
  variants: {},
  plugins: [],
}
