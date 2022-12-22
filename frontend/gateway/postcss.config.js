var plugins = ['tailwindcss', 'postcss-partial-import', 'postcss-nesting']

if (process.env.NODE_ENV == 'production') {
  plugins.push([
    'postcss-flexbugs-fixes',
    [
      'postcss-preset-env',
      {
        autoprefixer: {
          flexbox: 'no-2009',
        },
        stage: 3,
        features: {
          'custom-properties': false,
        },
      },
    ],
    'cssnano',
  ])
}

module.exports = {
  plugins,
}
