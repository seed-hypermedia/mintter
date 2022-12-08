/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.{tsx,mdx}",
  ],
  darkMode: 'media',
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
      '3xl': '1920px',
    },
    // typography: (theme) => ({
    //   default: {
    //     css: {
    //       fontSize: '1.125rem',
    //       color: theme('colors.gray.900'),

    //       strong: {
    //         color: theme('colors.gray.900'),
    //       },
    //       a: {
    //         color: theme('colors.blue.700'),
    //       },
    //     },
    //   },
    // }),
    extend: {
      maxWidth: {
        custom: '40ch',
      },
    },
  },
  variants: {},
  plugins: [require('@tailwindcss/typography')],
}
