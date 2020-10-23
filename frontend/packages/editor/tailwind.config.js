module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  purge: {
    mode: 'all',
    content: [`./src/**/*.tsx`],
  },
  theme: {
    extend: {},
    typography: theme => ({
      default: {
        css: {
          fontSize: '1.125rem',
          color: theme('colors.gray.900'),
          marginTop: 0,
          marginBottom: 0,
          strong: {
            color: theme('colors.gray.900'),
          },
          a: {
            color: theme('colors.blue.700'),
          },
          p: {
            marginTop: 0,
            marginBottom: 0,
          },
        },
      },
      xl: {
        css: {
          p: {
            marginTop: 0,
            marginBottom: 0,
          },
        },
      },
      '2xl': {
        css: {
          p: {
            marginTop: 0,
            marginBottom: 0,
          },
        },
      },
      '3xl': {
        css: {
          p: {
            marginTop: 0,
            marginBottom: 0,
          },
        },
      },
    }),
  },
  variants: {},
  plugins: [require('@tailwindcss/typography')],
}
