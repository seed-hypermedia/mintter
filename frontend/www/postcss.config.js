module.exports = {
  plugins: [
    require('tailwindcss'),
    ...(process.env.NODE_ENV === 'production'
      ? [
          require('@fullhuman/postcss-purgecss')({
            content: [
              './pages/**/*.{ts,tsx}',
              './components/**/*.{ts,tsx}',
              './plugins/**/*.{ts,tsx}',
            ],
            defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
          }),
        ]
      : []),
    require('postcss-preset-env'),
    // require("autoprefixer")
  ],
}
