const postcss = require('rollup-plugin-postcss')
module.exports = {
  rollup(config, options) {
    config.plugins.push(
      postcss({
        plugins: [require('tailwindcss'), require('autoprefixer')],
      }),
    )
    return config
  },
}
